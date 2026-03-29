import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PAGE_SIZE = 100
const MAX_PRODUCTS = 10000

const FETCH_MAX_ATTEMPTS = 10
const FETCH_INITIAL_DELAY_MS = 2000

const MS_BETWEEN_SEARCH_PAGES = 6200
const PRODUCT_CATEGORY_UPSERT_CHUNK = 500

const args = new Set(process.argv.slice(2))
const relationsOnly = args.has('--relations-only')

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// function to fetch with retry
async function fetchWithRetry(url) {
    let delay = FETCH_INITIAL_DELAY_MS
    // for each attempt, fetch the URL
    for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt++) {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'food-faceted-search/0.1.0 (product import; local dev)',
            },
        })

        if (response.ok) return response

        // check if the response is retryable
        const retryable =
            response.status === 429 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504

        // if the response is not retryable or we have reached the maximum number of attempts, return the response
        if (!retryable || attempt === FETCH_MAX_ATTEMPTS) {
            return response
        }

        // get the retry-after header
        const retryAfter = response.headers.get('Retry-After')
        const waitMs = retryAfter
            ? Math.min(60_000, Math.max(delay, Number(retryAfter) * 1000 || delay))
            : delay

        // log the retry attempt
        console.warn(
            `HTTP ${response.status} (attempt ${attempt}/${FETCH_MAX_ATTEMPTS}), retrying in ${Math.round(waitMs / 1000)}s...`
        )
        await sleep(waitMs)
        delay = Math.min(delay * 2, 60_000)
    }
}

// function to normalize the brand
function normalizeBrand(raw) {
    if (!raw) return null
    const firstBrand = raw.split(',')[0]?.trim()
    return firstBrand || null
}

// function to normalize the categories
function normalizeCategories(raw) {
    if (!raw) return []

    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10)
}

// function to map the product
function mapProduct(product) {
    // get the barcode and name
    const barcode = product.code?.trim()
    const name = product.product_name?.trim()

    if (!barcode || !name) return null

    // return the product
    return {
        barcode,
        name,
        image_url: product.image_front_small_url || product.image_front_url || null,
        brand: normalizeBrand(product.brands),
        categories: normalizeCategories(product.categories),
    }
}

// function to fetch the page
async function fetchPage(page) {
    // create the URL search params
    const params = new URLSearchParams({
        page_size: String(PAGE_SIZE),
        page: String(page),
        fields: 'code,product_name,image_front_small_url,image_front_url,brands,categories',
    })
    // create the URL
    const url = `https://world.openfoodfacts.net/api/v2/search?${params}`

    // fetch the page with retry
    const response = await fetchWithRetry(url)

    if (!response.ok) {
        throw new Error(`Failed to fetch page ${page}: ${response.status}`)
    }

    // return the JSON response
    return response.json()
}

// function to fetch all products
async function fetchAllProducts() {
    const products = []
    let page = 1

    // while the products are less than the maximum number of products, fetch the page
    while (products.length < MAX_PRODUCTS) {
        // log the page
        console.log(`Fetching page ${page}...`)
        const data = await fetchPage(page)
        // get the raw products
        const rawProducts = data.products || []
        // if the raw products are not set, break
        if (!rawProducts.length) break

        // map the raw products
        const mapped = rawProducts.map(mapProduct).filter(Boolean)
        // push the mapped products to the products array
        products.push(...mapped)

        // increment the page
        page += 1
        if (products.length < MAX_PRODUCTS && rawProducts.length) {
            await sleep(MS_BETWEEN_SEARCH_PAGES)
        }
    }

    // return the products array sliced to the maximum number of products
    return products.slice(0, MAX_PRODUCTS)
}

// function to insert the brands
async function insertBrands(products) {
    const uniqueBrands = Array.from(
        new Set(products.map((p) => p.brand).filter(Boolean))
    ).map((name) => ({ name }))

    // if the unique brands are not empty, insert the brands
    if (uniqueBrands.length > 0) {
        const { error } = await supabase
            .from('brands')
            .upsert(uniqueBrands, { onConflict: 'name' })

        if (error) throw error
    }

    // get the brands
    const { data, error } = await supabase.from('brands').select('id, name')
    if (error) throw error

    // return the brands map
    return new Map(data.map((row) => [row.name, row.id]))
}

// function to insert the categories
async function insertCategories(products) {
    // get the unique categories
    const uniqueCategories = Array.from(
        new Set(products.flatMap((p) => p.categories))
    ).map((name) => ({ name }))

    // if the unique categories are not empty, insert the categories
    if (uniqueCategories.length > 0) {
        const { error } = await supabase
            .from('categories')
            .upsert(uniqueCategories, { onConflict: 'name' })

        if (error) throw error
    }

    // get the categories
    const { data, error } = await supabase.from('categories').select('id, name')
    if (error) throw error

    // return the categories map
    return new Map(data.map((row) => [row.name, row.id]))
}

// function to insert the products
async function insertProducts(products, brandMap) {
    // get the product rows
    const productRows = products.map((product) => ({
        barcode: product.barcode,
        name: product.name,
        image_url: product.image_url,
        brand_id: product.brand ? brandMap.get(product.brand) ?? null : null,
    }))

    // insert the product rows
    const { error } = await supabase
        .from('products')
        .upsert(productRows, { onConflict: 'barcode' })

    if (error) throw error
}

// function to insert the product categories
async function insertProductCategories(products, categoryMap) {
    const rows = []

    // for each product, get the categories
    for (const product of products) {
        // for each category, get the category ID
        for (const category of product.categories) {
            const categoryId = categoryMap.get(category)
            if (!categoryId) continue

            // push the product barcode and category ID to the rows array
            rows.push({
                product_barcode: product.barcode,
                category_id: categoryId,
            })
        }
    }

    if (rows.length === 0) return
    // create a set of seen rows
    const seen = new Set()
    // create an array of unique rows
    const uniqueRows = []
    // for each row, get the key
    for (const row of rows) {
        const key = `${row.product_barcode}:${row.category_id}`
        if (seen.has(key)) continue
        seen.add(key)
        uniqueRows.push(row)
    }

    // for each chunk, insert the product categories
    for (let i = 0; i < uniqueRows.length; i += PRODUCT_CATEGORY_UPSERT_CHUNK) {
        const chunk = uniqueRows.slice(i, i + PRODUCT_CATEGORY_UPSERT_CHUNK)
        const { error } = await supabase
            .from('product_categories')
            .upsert(chunk, { onConflict: 'product_barcode,category_id' })

        if (error) throw error
    }
}

// function to main
async function main() {
    // log the fetching products from Open Food Facts
    console.log('Fetching products from Open Food Facts...')
    const products = await fetchAllProducts()
    // log the number of products fetched
    console.log(`Fetched ${products.length} products`)

    // if the relations only flag is set, log the relations only message and insert the categories and product categories
    if (relationsOnly) {
        console.log('Relations-only: skipping brands and products tables.')
        console.log('Inserting categories (upsert any missing)...')
        const categoryMap = await insertCategories(products)
        console.log('Inserting product-category relations...')
        await insertProductCategories(products, categoryMap)
        console.log('Import finished successfully')
        return
    }

    console.log('Inserting brands...')
    const brandMap = await insertBrands(products)

    console.log('Inserting categories...')
    const categoryMap = await insertCategories(products)

    console.log('Inserting products...')
    await insertProducts(products, brandMap)

    console.log('Inserting product-category relations...')
    await insertProductCategories(products, categoryMap)

    console.log('Import finished successfully')
}

main().catch((error) => {
    console.error('Import failed:')
    console.error(error)
    process.exit(1)
})