import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// number of products per page
const PAGE_SIZE = 20
// number of products to fetch at a time for facet counts
const FACET_FETCH_CHUNK = 1000

// parse comma-separated URL params
function parseMultiValue(value: string | null) {
    if (!value) return []

    return value.split(',').map((item) => item.trim()).filter(Boolean)
}

type BrandRow = { brand: string | null }
type CategoryRow = { categories: string[] | null }

// fetch all products in chunks
async function fetchAllInChunks<T>(
    fetchChunk: (
        from: number,
        to: number
    ) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
    const rows: T[] = []

    // loop through the chunks
    for (let from = 0; ; from += FACET_FETCH_CHUNK) {
        // calculate the to index
        const to = from + FACET_FETCH_CHUNK - 1
        // fetch the chunk
        const { data, error } = await fetchChunk(from, to)

        if (error) {
            throw error
        }

        // add the products to the array
        const batch = data ?? []
        rows.push(...batch)

        // if the batch is smaller than the chunk size, break
        if (batch.length < FACET_FETCH_CHUNK) {
            break
        }
    }

    // return the products
    return rows
}

// fetch all brand values for rows matching text + category filters
async function fetchAllBrandRowsForFacets(
    supabase: ReturnType<typeof createServerClient>,
    q: string,
    categories: string[]
): Promise<BrandRow[]> {
    return fetchAllInChunks<BrandRow>(async (from, to) => {
        // create the query
        let facetQuery = supabase.from('products').select('brand')

        // if there is a query, add the filter
        if (q) {
            facetQuery = facetQuery.ilike('name', `%${q}%`)
        }
        // if there are categories, add the filter
        if (categories.length > 0) {
            facetQuery = facetQuery.overlaps('categories', categories)
        }

        // return the query
        return facetQuery.order('barcode', { ascending: true }).range(from, to)
    })
}

// fetch all category values for rows matching text + brand filters
async function fetchAllCategoryRowsForFacets(
    supabase: ReturnType<typeof createServerClient>,
    q: string,
    brands: string[]
): Promise<CategoryRow[]> {
    return fetchAllInChunks<CategoryRow>(async (from, to) => {
        // create the query
        let facetQuery = supabase.from('products').select('categories')

        // if there is a query, add the filter
        if (q) {
            facetQuery = facetQuery.ilike('name', `%${q}%`)
        }
        // if there are brands, add the filter
        if (brands.length > 0) {
            facetQuery = facetQuery.in('brand', brands)
        }

        // return the query
        return facetQuery.order('barcode', { ascending: true }).range(from, to)
    })
}

// count how often each string appears
function mapToSortedFacets(
    counts: Map<string, number>,
    limit: number
): { value: string; count: number }[] {
    // return the counts
    return Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
}

// GET /api/search
export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient()
        const searchParams = request.nextUrl.searchParams

        // get the query, page, brands, and categories
        const q = searchParams.get('q')?.trim() || ''
        const rawPage = Number(searchParams.get('page') || '1')
        const page =
            Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1

        // parse the brands and categories
        const brands = parseMultiValue(searchParams.get('brands'))
        const categories = parseMultiValue(searchParams.get('categories'))

        // calculate the from and to indices
        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        // create the query
        let query = supabase.from('products').select('*', { count: 'exact' })

        // if there is a query, add the filter
        if (q) {
            query = query.ilike('name', `%${q}%`)
        }

        // if there are brands, add the filter
        if (brands.length > 0) {
            query = query.in('brand', brands)
        }

        // if there are categories, add the filter
        if (categories.length > 0) {
            query = query.overlaps('categories', categories)
        }

        // fetch the items
        const { data: items, count, error } = await query
            .order('name', { ascending: true })
            .range(from, to)

        if (error) {
            throw error
        }

        // fetch all brand values for rows matching text + category filters
        const brandRows = await fetchAllBrandRowsForFacets(supabase, q, categories)
        // create a map to store the brand counts
        const brandCountsMap = new Map<string, number>()

        // loop through the brand rows
        for (const row of brandRows) {
            const brand = row.brand?.trim()
            if (!brand) continue

            // add the brand to the map
            brandCountsMap.set(brand, (brandCountsMap.get(brand) || 0) + 1)
        }

        // map the brand counts to sorted facets
        const brandFacets = mapToSortedFacets(brandCountsMap, 100)

        // fetch all category values for rows matching text + brand filters
        const categoryRows = await fetchAllCategoryRowsForFacets(supabase, q, brands)
        // create a map to store the category counts
        const categoryCountsMap = new Map<string, number>()

        // loop through the category rows
        for (const row of categoryRows) {
            for (const category of row.categories || []) {
                const normalizedCategory = category?.trim()
                if (!normalizedCategory) continue
                // add the category to the map
                categoryCountsMap.set(
                    normalizedCategory,
                    (categoryCountsMap.get(normalizedCategory) || 0) + 1
                )
            }
        }

        // map the category counts to sorted facets
        const categoryFacets = mapToSortedFacets(categoryCountsMap, 100)

        // return the response
        return NextResponse.json({
            items: items || [],
            total: count || 0,
            page,
            pageSize: PAGE_SIZE,
            facets: {
                brands: brandFacets,
                categories: categoryFacets,
            },
        })
    } catch (error) {
        // log the error
        console.error('Search API error:', error)
        // return the error

        return NextResponse.json(
            { error: 'Failed to fetch search results' },
            { status: 500 }
        )
    }
}
