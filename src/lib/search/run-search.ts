import { createServerClient } from '@/lib/supabase/server'
import type { Product, SearchResponse } from '@/types/product'

// number of products per page
const PAGE_SIZE = 20
// number of products to fetch at a time for facet counts
const FACET_FETCH_CHUNK = 1000
// number of parallel range requests per wave
const FACET_FETCH_CONCURRENCY = 4

// function to parse the multi value
function parseMultiValue(value: string | null) {
    if (!value) return []

    return value.split(',').map((item) => item.trim()).filter(Boolean)
}

// function to resolve the brand ids
async function resolveBrandIds(
    // the supabase client
    supabase: ReturnType<typeof createServerClient>,
    // the names to resolve
    names: string[]
): Promise<number[]> {
    // if the names are empty, return an empty array
    if (names.length === 0) return []

    // get the data from the brands table
    const { data, error } = await supabase
        .from('brands')
        .select('id')
        .in('name', names)

    if (error) throw error

    // return the ids
    return (data ?? []).map((r) => r.id)
}

// function to resolve the category ids
async function resolveCategoryIds(
    supabase: ReturnType<typeof createServerClient>,
    names: string[]
): Promise<number[]> {
    if (names.length === 0) return []

    // get the data from the categories table
    const { data, error } = await supabase
        .from('categories')
        .select('id')
        .in('name', names)

    if (error) throw error

    // return the ids
    return (data ?? []).map((r) => r.id)
}

// function to get the product barcodes for the categories
async function productBarcodesForCategories(
    supabase: ReturnType<typeof createServerClient>,
    categoryIds: number[]
): Promise<string[]> {
    if (categoryIds.length === 0) return []

    // get the data from the product categories table
    const { data, error } = await supabase
        .from('product_categories')
        .select('product_barcode')
        .in('category_id', categoryIds)

    if (error) throw error

    // return the product barcodes
    return [...new Set((data ?? []).map((r) => r.product_barcode))]
}

// function to get the embedded name
function embeddedName(
    // the node to get the embedded name from
    node: { name?: string | null } | { name?: string | null }[] | null | undefined
): string | null {
    // if the node is null, return null
    if (node == null) return null
    // get the row
    const row = Array.isArray(node) ? node[0] : node
    // get the name
    const n = row?.name?.trim()
    // return the name
    return n ? n : null
}

// function to map the database product row
function mapDbProductRow(
    // the row to map
    row: {
        // the row to map
        barcode: string
        name: string
        image_url: string | null,
        brands: { name?: string | null } | { name?: string | null }[] | null,
        product_categories: { categories: { name?: string | null } | { name?: string | null }[] | null }[] | null
    }): Product {
    // get the brand
    const brand = embeddedName(row.brands)

    // get the categories
    const categories: string[] = []
    // for each product category, get the embedded name
    for (const pc of row.product_categories ?? []) {
        const n = embeddedName(pc.categories)
        if (n) categories.push(n)
    }

    // return the product
    return {
        barcode: row.barcode,
        name: row.name,
        image_url: row.image_url,
        brand,
        categories,
    }
}

// type for the brand facet row
type BrandFacetRow = {
    brands:
    { name?: string | null } | { name?: string | null }[] | null
}

// type for the category facet row
type CategoryFacetRow = {
    product_categories:
    { categories: { name?: string | null } | { name?: string | null }[] | null }[] | null
}

// fetch all rows in parallel waves of range queries
async function fetchAllChunksParallel<T>(
    // the function to fetch the chunks
    fetchChunk: (
        // the from index
        from: number,
        to: number
    ) => Promise<{ data: T[] | null; error: { message: string } | null }>
    // the rows to return
): Promise<T[]> {
    // create an array of rows
    const rows: T[] = []
    // create a variable to store the wave start
    let waveStart = 0

    // while true, create a wave
    while (true) {
        // create an array of waves
        const wave = []
        // for each concurrency, create a wave
        for (let i = 0; i < FACET_FETCH_CONCURRENCY; i++) {
            // create a variable to store the from index
            const from = waveStart + i * FACET_FETCH_CHUNK
            // create a variable to store the to index
            const to = from + FACET_FETCH_CHUNK - 1
            // push the wave to the array
            wave.push(
                fetchChunk(from, to).then((result) => ({
                    from,
                    data: result.data,
                    error: result.error,
                }))
            )
        }

        // wait for all the waves to complete
        const results = await Promise.all(wave)
        // sort the results by the from index
        results.sort((a, b) => a.from - b.from)

        // create a variable to store the stop flag
        let stop = false
        // for each result, push the data to the rows array
        for (const r of results) {
            if (r.error) throw r.error
            const batch = r.data ?? []
            rows.push(...batch)
            // if the batch length is less than the chunk size, set the stop flag to true
            if (batch.length < FACET_FETCH_CHUNK) {
                stop = true
                break
            }
        }

        // if the stop flag is true, break the loop
        if (stop) break
        waveStart += FACET_FETCH_CONCURRENCY * FACET_FETCH_CHUNK
    }

    // return the rows
    return rows
}

// function to fetch all brand values for rows matching text + category filters
async function fetchAllBrandRowsForFacets(
    supabase: ReturnType<typeof createServerClient>,
    q: string,
    categories: string[],
    categoryBarcodes: string[] | null
): Promise<BrandFacetRow[]> {
    if (categories.length > 0 && (!categoryBarcodes || categoryBarcodes.length === 0)) {
        return []
    }

    // return the brand facet rows
    return fetchAllChunksParallel<BrandFacetRow>(async (from, to) => {
        // create a query to select the brands
        let facetQuery = supabase.from('products').select('brands(name)')

        // if the query is not empty, add the like query
        if (q) {
            facetQuery = facetQuery.ilike('name', `%${q}%`)
        }
        // if the categories are not empty and the category barcodes are not empty, add the in query
        if (categories.length > 0 && categoryBarcodes) {
            facetQuery = facetQuery.in('barcode', categoryBarcodes)
        }

        // return the query
        return facetQuery.order('barcode', { ascending: true }).range(from, to)
    })
}

// function to fetch all category values for rows matching text + brand filters
async function fetchAllCategoryRowsForFacets(
    supabase: ReturnType<typeof createServerClient>,
    q: string,
    brands: string[],
    brandIds: number[]
): Promise<CategoryFacetRow[]> {
    if (brands.length > 0 && brandIds.length === 0) {
        return []
    }

    // return the category facet rows
    return fetchAllChunksParallel<CategoryFacetRow>(async (from, to) => {
        let facetQuery = supabase
            .from('products')
            .select('product_categories(categories(name))')

        // if the query is not empty, add the like query
        if (q) {
            facetQuery = facetQuery.ilike('name', `%${q}%`)
        }
        // if the brands are not empty and the brand ids are not empty, add the in query
        if (brands.length > 0) {
            facetQuery = facetQuery.in('brand_id', brandIds)
        }

        // return the query
        return facetQuery.order('barcode', { ascending: true }).range(from, to)
    })
}

// function to map the counts to sorted facets
function mapToSortedFacets(counts: Map<string, number>): { value: string; count: number }[] {
    // map the counts to an array of values and counts
    return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        // sort the counts by the count
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count
            return a.value.localeCompare(b.value)
        })
}

// function to fetch the paged products
async function fetchPagedProducts(
    // the supabase client
    supabase: ReturnType<typeof createServerClient>,
    args: {
        q: string
        page: number
        brandIds: number[]
        categoryBarcodes: string[] | null
        brandFilterImpossible: boolean
        categoryFilterImpossible: boolean
        categorySelectionEmpty: boolean
    }
): Promise<{ items: Product[]; total: number }> {
    const {
        q,
        page,
        brandIds,
        categoryBarcodes,
        brandFilterImpossible,
        categoryFilterImpossible,
        categorySelectionEmpty,
    } = args

    if (
        brandFilterImpossible ||
        categoryFilterImpossible ||
        categorySelectionEmpty
    ) {
        return { items: [], total: 0 }
    }

    // create a variable to store the from index
    const from = (page - 1) * PAGE_SIZE
    // create a variable to store the to index
    const to = from + PAGE_SIZE - 1

    // create a query to select the products
    let query = supabase.from('products').select(
        `
            barcode,
            name,
            image_url,
            brands(name),
            product_categories(categories(name))
          `,
        { count: 'exact' }
    )

    // if the query is not empty, add the like query
    if (q) {
        query = query.ilike('name', `%${q}%`)
    }
    // if the brand ids are not empty, add the in query
    if (brandIds.length > 0) {
        query = query.in('brand_id', brandIds)
    }
    // if the category barcodes are not empty and the category barcodes are not null, add the in query
    if (categoryBarcodes && categoryBarcodes.length > 0) {
        query = query.in('barcode', categoryBarcodes)
    }

    // execute the query
    const { data: rawItems, count, error } = await query
        .order('name', { ascending: true })
        .range(from, to)

    if (error) {
        throw error
    }

    // map the raw items to products
    const items = (rawItems ?? []).map((row) =>
        mapDbProductRow(row as Parameters<typeof mapDbProductRow>[0])
    )

    // return the items and total
    return { items, total: count ?? 0 }
}

// function to run the search
export async function runSearch(searchParams: URLSearchParams): Promise<SearchResponse> {
    const supabase = createServerClient()

    // get the query, page, brands, and categories
    const q = searchParams.get('q')?.trim() || ''
    const rawPage = Number(searchParams.get('page') || '1')
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1

    // parse the brands and categories
    const brands = parseMultiValue(searchParams.get('brands'))
    const categories = parseMultiValue(searchParams.get('categories'))

    // resolve the brand and category ids
    const [brandIds, categoryIds] = await Promise.all([
        resolveBrandIds(supabase, brands),
        resolveCategoryIds(supabase, categories),
    ])

    // create a variable to store the category barcodes
    let categoryBarcodes: string[] | null = null
    // if the category ids are not empty, get the product barcodes for the categories
    if (categoryIds.length > 0) {
        categoryBarcodes = await productBarcodesForCategories(supabase, categoryIds)
    }

    // create a variable to store the brand filter impossible
    const brandFilterImpossible = brands.length > 0 && brandIds.length === 0
    // create a variable to store the category filter impossible
    const categoryFilterImpossible = categories.length > 0 && categoryIds.length === 0
    // create a variable to store the category selection empty
    const categorySelectionEmpty =
        categoryIds.length > 0 &&
        categoryBarcodes !== null &&
        categoryBarcodes.length === 0

    // fetch the paged products, brand rows, and category rows
    const [{ items, total }, brandRows, categoryRows] = await Promise.all([
        fetchPagedProducts(supabase, {
            q,
            page,
            brandIds,
            categoryBarcodes,
            brandFilterImpossible,
            categoryFilterImpossible,
            categorySelectionEmpty,
        }),
        fetchAllBrandRowsForFacets(supabase, q, categories, categoryBarcodes),
        fetchAllCategoryRowsForFacets(supabase, q, brands, brandIds),
    ])

    // create a map to store the brand counts
    const brandCountsMap = new Map<string, number>()
    for (const row of brandRows) {
        const brand = embeddedName(row.brands)
        if (!brand) continue
        brandCountsMap.set(brand, (brandCountsMap.get(brand) || 0) + 1)
    }
    // map the brand counts to sorted facets
    const brandFacets = mapToSortedFacets(brandCountsMap)

    // create a map to store the category counts
    const categoryCountsMap = new Map<string, number>()
    // for each category row, get the embedded name
    for (const row of categoryRows) {
        for (const pc of row.product_categories ?? []) {
            // get the embedded name
            const normalizedCategory = embeddedName(pc.categories)
            // if the normalized category is null, continue
            if (!normalizedCategory) continue
            // set the category count
            categoryCountsMap.set(
                normalizedCategory,
                (categoryCountsMap.get(normalizedCategory) || 0) + 1
            )
        }
    }
    // map the category counts to sorted facets
    const categoryFacets = mapToSortedFacets(categoryCountsMap)

    // return the search response
    return {
        items,
        total,
        page,
        pageSize: PAGE_SIZE,
        facets: {
            brands: brandFacets,
            categories: categoryFacets,
        },
    }
}
