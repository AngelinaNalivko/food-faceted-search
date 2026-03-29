'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useNavigateSearch } from '@/components/navigation-provider'
import { joinMultiParam, parseMultiParam, toggleValue } from '@/lib/url-state'
import type { FacetValue } from '@/types/product'

// type for the facet row
type FacetRow = FacetValue & { missingFromApi?: boolean }

// function to build the ordered facet rows
function buildOrderedFacetRows(
    // the items to build the ordered facet rows from
    items: FacetValue[],
    // the selected values
    selectedValues: string[]
): FacetRow[] {
    // create a map of the items by value
    const byValue = new Map(items.map((i) => [i.value, i]))

    // create an array of unique selected values
    const uniqueSelected: string[] = []
    // create a set of seen selected values
    const seenSelected = new Set<string>()
    for (const value of selectedValues) {
        // if the value has already been seen, continue
        if (seenSelected.has(value)) continue
        seenSelected.add(value)
        // add the value to the unique selected values
        uniqueSelected.push(value)
    }

    // create a set of unique selected values
    const selectedSet = new Set(uniqueSelected)

    // create an array of pinned facet rows
    const pinned: FacetRow[] = []
    // for each unique selected value, get the item from the map
    for (const value of uniqueSelected) {
        const fromApi = byValue.get(value)
        // if the item from the map exists, add it to the pinned facet rows
        if (fromApi) {
            pinned.push(fromApi)
        } else {
            // if the item from the map does not exist, add a new facet row with the value and count 0
            pinned.push({
                value,
                count: 0,
                missingFromApi: true,
            })
        }
    }

    // create an array of rest facet rows
    const rest = items.filter((i) => !selectedSet.has(i.value))
    // return the pinned and rest facet rows
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
    const { isPending, navigateWithParams } = useNavigateSearch()
    const searchParams = useSearchParams()

    // get the selected values from the URL
    const selectedValues = parseMultiParam(searchParams.get(paramName) || '')

    // create an array of display rows
    const displayRows = useMemo(
        () => buildOrderedFacetRows(items, selectedValues),
        [items, selectedValues]
    )

    // handle clear selected
    function handleClearSelected() {
        // create a new URLSearchParams object
        const params = new URLSearchParams(searchParams.toString())
        // delete the parameter
        params.delete(paramName)
        // delete the page parameter
        params.delete('page')
        navigateWithParams(params)
    }

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
        navigateWithParams(params)
    }

    return (
        <div
            className={`rounded-xl border p-4 ${isPending ? 'opacity-70' : ''}`}
            aria-busy={isPending}
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                {/* title */}
                <h2 className="text-lg font-semibold">{title}</h2>
                {selectedValues.length > 0 ? (
                    <button
                        type="button"
                        onClick={handleClearSelected}
                        disabled={isPending}
                        className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Clear selected ({selectedValues.length})
                    </button>
                ) : null}
            </div>

            {/* list of items */}
            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                {/* if there are no items and nothing selected, show a message */}
                {displayRows.length === 0 ? (
                    <p className="text-sm text-gray-500">No options available</p>
                ) : (
                    displayRows.map((item) => {
                        const checked = selectedValues.includes(item.value)

                        // return the label
                        return (
                            <label
                                key={item.value}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-gray-50"
                            >
                                <span className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={isPending}
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
