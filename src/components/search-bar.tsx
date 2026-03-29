'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useNavigateSearch } from '@/components/navigation-provider'

// props for the search bar component
type SearchBarProps = {
    initialQuery: string
}
// search bar component
export default function SearchBar({ initialQuery }: SearchBarProps) {
    // create a state for the value
    const [value, setValue] = useState(initialQuery)

    // get the is pending state and navigate with params
    const { isPending, navigateWithParams } = useNavigateSearch()
    const searchParams = useSearchParams()

    // use effect to set the value
    useEffect(() => {
        setValue(initialQuery)
    }, [initialQuery])

    // function to clone the current query string
    function cloneParams() {
        return new URLSearchParams(searchParams.toString())
    }
    // function to handle the submit event
    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        // prevent default form submission
        event.preventDefault()

        // clone the current query string
        const params = cloneParams()
        // trim the value
        const trimmed = value.trim()

        if (trimmed) {
            params.set('q', trimmed)
        } else {
            params.delete('q')
        }

        // reset pagination
        params.delete('page')
        navigateWithParams(params)
    }

    // function to handle the clear event
    function handleClear() {
        // set the value to an empty string
        setValue('')
        // clone the current query string
        const params = cloneParams()
        params.delete('q')
        params.delete('page')
        // navigate with the params
        navigateWithParams(params)
    }

    // return the search bar component
    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
            {/* search input */}
            <input
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Search products..."
                disabled={isPending}
                className="min-w-[12rem] flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-gray-500 disabled:opacity-60"
            />

            {/* search button */}
            <button
                type="submit"
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isPending ? 'Searching…' : 'Search'}
            </button>

            {/* clear button */}
            <button
                type="button"
                onClick={handleClear}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                Clear
            </button>
        </form>
    )
}
