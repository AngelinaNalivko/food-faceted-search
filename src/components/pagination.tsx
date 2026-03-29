'use client'

import { useSearchParams } from 'next/navigation'
import { useNavigateSearch } from '@/components/navigation-provider'

type PaginationProps = {
    page: number
    total: number
    pageSize: number
}

// pagination component
export default function Pagination({
    page,
    total,
    pageSize,
}: PaginationProps) {
    const { isPending, navigateWithParams } = useNavigateSearch()
    const searchParams = useSearchParams()
    // calculate the total number of pages  
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    // if there is only one page, don't show the pagination
    if (totalPages <= 1) {
        return null
    }

    // go to a specific page
    function goToPage(nextPage: number) {
        const params = new URLSearchParams(searchParams.toString())

        // if the page is 1, delete the page parameter
        if (nextPage <= 1) {
            params.delete('page')
        } else {
            // set the page parameter
            params.set('page', String(nextPage))
        }

        navigateWithParams(params)
    }

    return (
        <div
            className={`mt-8 flex items-center justify-between rounded-xl border p-4 ${isPending ? 'opacity-70' : ''}`}
            aria-busy={isPending}
        >
            {/* previous button */}
            <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || isPending}
                className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Previous
            </button>

            {/* current page */}
            <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
            </p>

            {/* next button */}
            <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || isPending}
                className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Next
            </button>
        </div>
    )
}
