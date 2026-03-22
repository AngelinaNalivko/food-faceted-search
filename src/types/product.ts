// shared types for products returned from the API

export type Product = {
    barcode: string
    name: string
    image_url: string | null
    brand: string | null
    categories: string[]
}

// facet value with how many products match
export type FacetValue = {
    value: string
    count: number
}

// JSON returned by GET /api/search
export type SearchResponse = {
    items: Product[]
    total: number
    page: number
    pageSize: number
    facets: {
        brands: FacetValue[]
        categories: FacetValue[]
    }
}
