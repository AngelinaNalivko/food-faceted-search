'use client'

import { useNavigateSearch } from '@/components/navigation-provider'

// pending bar component
export default function PendingBar() {
    // get the is pending state
    const { isPending } = useNavigateSearch()

    // if the is pending state is false, return null
    if (!isPending) return null

    // return the pending bar
    return (
        <div
            className="pointer-events-none fixed top-0 right-0 left-0 z-50 h-1 animate-pulse bg-gray-900/70"
            role="progressbar"
            aria-label="Loading results"
        />
    )
}
