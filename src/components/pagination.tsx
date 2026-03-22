'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

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
    const router = useRouter()
    const pathname = usePathname()
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

        // push the new URL with the updated query string
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="mt-8 flex items-center justify-between rounded-xl border p-4">
            {/* previous button */}
            <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
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
                disabled={page >= totalPages}
                className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Next
            </button>
        </div>
    )
}
