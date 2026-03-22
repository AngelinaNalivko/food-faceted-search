'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { joinMultiParam, parseMultiParam, toggleValue } from '@/lib/url-state'
import type { FacetValue } from '@/types/product'

// props for the facet filters component
type FacetFiltersProps = {
    title: string
    paramName: 'brands' | 'categories'
    items: FacetValue[]
}

// facet filters component
export default function FacetFilters({
    title,
    paramName,
    items,
}: FacetFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // get the selected values from the URL
    const selectedValues = parseMultiParam(searchParams.get(paramName) || '')

    // handle toggle: add or remove the value from the URL
    function handleToggle(value: string) {
        // create a new URLSearchParams object
        const params = new URLSearchParams(searchParams.toString())

        // toggle the value
        const nextValues = toggleValue(selectedValues, value)

        if (nextValues.length > 0) {
            // set the new values in the URL
            params.set(paramName, joinMultiParam(nextValues))
        } else {
            // remove the value from the URL
            params.delete(paramName)
        }

        // reset the page
        params.delete('page')
        // push the new URL with the updated query string
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="rounded-xl border p-4">
            {/* title */}
            <h2 className="mb-3 text-lg font-semibold">{title}</h2>

            {/* list of items */}
            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                {/* if there are no items, show a message */}
                {items.length === 0 ? (
                    <p className="text-sm text-gray-500">No options available</p>
                ) : (
                    // map over the items
                    items.map((item) => {
                        // check if the item is selected
                        const checked = selectedValues.includes(item.value)

                        return (
                            // label for the item
                            <label
                                key={item.value}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-gray-50"
                            >
                                {/* checkbox and item value */}
                                <span className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => handleToggle(item.value)}
                                    />
                                    <span className="text-sm">{item.value}</span>
                                </span>

                                {/* count of products matching the item */}
                                <span className="text-sm text-gray-500">
                                    {item.count}
                                </span>
                            </label>
                        )
                    })
                )}
            </div>
        </div>
    )
}
