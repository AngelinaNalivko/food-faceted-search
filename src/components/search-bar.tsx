'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// props for the search bar component
type SearchBarProps = {
    initialQuery: string
}
 // search bar component
export default function SearchBar({ initialQuery }: SearchBarProps) {
    const [value, setValue] = useState(initialQuery)

    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // copy current query string to save brands and categories when searching
    function cloneParams() {
        return new URLSearchParams(searchParams.toString())
    }
    // search input: submit updates 'q' in the URL and resets pagination
    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        // prevent default form submission
        event.preventDefault()

        const params = cloneParams()
        const trimmed = value.trim()

        if (trimmed) {
            params.set('q', trimmed)
        } else {
            params.delete('q')
        }

        // reset pagination
        params.delete('page')
        // push new URL with updated query string
        router.push(`${pathname}?${params.toString()}`)
    }

    // clear search input: remove 'q' and 'page' from the URL
    function handleClear() {
        // clear search input
        setValue('')
        // remove 'q' and 'page' from the URL
        const params = cloneParams()
        params.delete('q')
        params.delete('page')

        // push new URL with updated query string
        router.push(`${pathname}?${params.toString()}`)
    }

    // return the search bar component
    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            {/* search input */}
            <input
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Search products..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-gray-500"
            />

            {/* search button */}
            <button
                type="submit"
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
            >
                Search
            </button>

            {/* clear button */}
            <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
            >
                Clear
            </button>
        </form>
    )
}
