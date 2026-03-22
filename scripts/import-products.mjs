import { createClient } from '@supabase/supabase-js'

function getSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
        throw new Error(
            'Missing Supabase env vars. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
        )
    }

    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
        throw new Error(
            'Invalid NEXT_PUBLIC_SUPABASE_URL. Use your project API URL (for example: https://<project-ref>.supabase.co), not the dashboard URL.'
        )
    }

    return { url, serviceRoleKey }
}

const { url: supabaseUrl, serviceRoleKey } = getSupabaseConfig()
const supabase = createClient(supabaseUrl, serviceRoleKey)

const PAGE_SIZE = 100
const MAX_PRODUCTS = 10000

function normalizeBrand(raw) {
    if (!raw) return null
    const firstBrand = raw.split(',')[0].trim()
    return firstBrand || null
}

function normalizeCategories(raw) {
    if (!raw) return []
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10)
}

function mapProduct(product) {
    const barcode = product.code?.trim()
    const name = product.product_name?.trim()

    if (!barcode || !name) return null

    return {
        barcode,
        name,
        image_url: product.image_front_small_url || product.image_front_url || null,
        brand: normalizeBrand(product.brands),
        categories: normalizeCategories(product.categories),
    }
}

async function fetchPage(page) {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=${PAGE_SIZE}&page=${page}&fields=code,product_name,image_front_small_url,image_front_url,brands,categories`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch page ${page}: ${response.status}`)
    }
    return response.json()
}

async function insertBatch(products) {
    if (!products.length) return 0

    const { error } = await supabase.from('products').upsert(products, { onConflict: 'barcode' })

    if (error) {
        throw error
    }

    return products.length
}

async function getCurrentProductsCount() {
    const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true })

    if (error) {
        throw error
    }

    return count ?? 0
}

async function filterExistingBarcodes(products) {
    if (!products.length) return []

    const uniqueProducts = Array.from(new Map(products.map((product) => [product.barcode, product])).values())
    const barcodes = uniqueProducts.map((product) => product.barcode)

    const { data, error } = await supabase.from('products').select('barcode').in('barcode', barcodes)
    if (error) {
        throw error
    }

    const existingBarcodes = new Set((data ?? []).map((row) => row.barcode))
    return uniqueProducts.filter((product) => !existingBarcodes.has(product.barcode))
}

async function main() {
    console.log('Start of importing products')

    let page = 1
    const existingProducts = await getCurrentProductsCount()
    const missingProducts = Math.max(0, MAX_PRODUCTS - existingProducts)

    if (missingProducts === 0) {
        console.log(`Database already has ${existingProducts} rows. Nothing to import.`)
        return
    }

    console.log(`Current rows: ${existingProducts}. Need to add ${missingProducts}.`)
    let inserted = 0

    while (inserted < missingProducts) {
        console.log(`Fetching page ${page}...`)

        const data = await fetchPage(page)
        const rawProducts = data.products || []

        if (!rawProducts.length) {
            console.log('No more products returned by API.')
            break
        }

        const mappedProducts = rawProducts.map(mapProduct).filter(Boolean)
        const newProducts = await filterExistingBarcodes(mappedProducts)

        const remaining = missingProducts - inserted
        const batch = newProducts.slice(0, remaining)

        const batchInserted = await insertBatch(batch)
        inserted += batchInserted

        console.log(`Inserted ${batchInserted} new products, total new ${inserted}`)

        page += 1
    }

    const finalCount = await getCurrentProductsCount()
    console.log(`Finished importing ${inserted} new products. Total rows in DB: ${finalCount}`)
}

main().catch((error) => {
    console.error('Error during import:', error)
    process.exit(1)
})