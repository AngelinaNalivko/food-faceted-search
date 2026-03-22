'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { joinMultiParam, parseMultiParam, toggleValue } from '@/lib/url-state'
import type { FacetValue } from '@/types/product'

// row shown in the list (selected-in-URL values pinned first; may be missing from API top-N)
type FacetRow = FacetValue & { missingFromApi?: boolean }

function buildOrderedFacetRows(
    items: FacetValue[],
    selectedValues: string[]
): FacetRow[] {
    const byValue = new Map(items.map((i) => [i.value, i]))

    const uniqueSelected: string[] = []
    const seenSelected = new Set<string>()
    for (const value of selectedValues) {
        if (seenSelected.has(value)) continue
        seenSelected.add(value)
        uniqueSelected.push(value)
    }

    const selectedSet = new Set(uniqueSelected)

    const pinned: FacetRow[] = []
    for (const value of uniqueSelected) {
        const fromApi = byValue.get(value)
        if (fromApi) {
            pinned.push(fromApi)
        } else {
            pinned.push({
                value,
                count: 0,
                missingFromApi: true,
            })
        }
    }

    const rest = items.filter((i) => !selectedSet.has(i.value))
    return [...pinned, ...rest]
}

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

    const displayRows = useMemo(
        () => buildOrderedFacetRows(items, selectedValues),
        [items, selectedValues]
    )

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
                {/* if there are no items and nothing selected, show a message */}
                {displayRows.length === 0 ? (
                    <p className="text-sm text-gray-500">No options available</p>
                ) : (
                    displayRows.map((item) => {
                        const checked = selectedValues.includes(item.value)

                        return (
                            <label
                                key={item.value}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-gray-50"
                            >
                                <span className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => handleToggle(item.value)}
                                    />
                                    <span className="text-sm">{item.value}</span>
                                </span>

                                <span className="text-sm text-gray-500">
                                    {item.missingFromApi ? '—' : item.count}
                                </span>
                            </label>
                        )
                    })
                )}
            </div>
        </div>
    )
}
