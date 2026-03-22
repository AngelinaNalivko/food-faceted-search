import SearchBar from '@/components/search-bar'
import FacetFilters from '@/components/facet-filters'
import ProductList from '@/components/product-list'
import Pagination from '@/components/pagination'
import { SearchResponse } from '@/types/product'

// props for the home page
type HomePageProps = {
  searchParams: Promise<{
    q?: string
    page?: string
    brands?: string
    categories?: string
  }>
}

// get the search data from the API
async function getSearchData(params: {
  q?: string
  page?: string
  brands?: string
  categories?: string
}): Promise<SearchResponse> {
  // create a new URLSearchParams object
  const query = new URLSearchParams()

  // set the parameters
  if (params.q) query.set('q', params.q)
  if (params.page) query.set('page', params.page)
  if (params.brands) query.set('brands', params.brands)
  if (params.categories) query.set('categories', params.categories)

  // get the base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')


  // fetch the search data
  const response = await fetch(`${baseUrl}/api/search?${query.toString()}`, {
    // don't cache the data when the URL changes
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch search data')
  }

  // parse the response as JSON
  return response.json()
}

// home page component
export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams

  // get the search data
  const data = await getSearchData(params)

  // get the current page
  const rawPage = Number(params.page || '1')
  // if the page is not a number, set it to 1
  const currentPage =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  // get the current query
  const currentQuery = params.q || ''

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      {/* title */}
      <h1 className="text-3xl font-bold">Food Faceted Search</h1>

      {/* search bar */}
      <div className="mt-8">
        <SearchBar initialQuery={currentQuery} />
      </div>

      {/* main content */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <FacetFilters
            title="Brands"
            paramName="brands"
            items={data.facets.brands}
          />

          <FacetFilters
            title="Categories"
            paramName="categories"
            items={data.facets.categories}
          />
        </aside>

        <section>
          {/* total results */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {data.total} result{data.total === 1 ? '' : 's'}
            </p>
          </div>

          {/* product list */}
          <ProductList items={data.items} />

          {/* pagination */}
          <Pagination
            page={currentPage}
            total={data.total}
            pageSize={data.pageSize}
          />
        </section>
      </div>
    </main>
  )
}
