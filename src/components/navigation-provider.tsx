'use client'

import {
    createContext,
    useCallback,
    useContext,
    useTransition,
    type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'

// type for the navigation context value
type NavigationContextValue = {
    isPending: boolean
    navigateWithParams: (params: URLSearchParams) => void
}

// create the navigation context
const NavigationContext = createContext<NavigationContextValue | null>(null)

// function to create the navigation provider
export function NavigationProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()

    // navigate with params
    const navigateWithParams = useCallback(
        (params: URLSearchParams) => {
            // get the query string
            const qs = params.toString()
            // start a transition
            startTransition(() => {
                // navigate to the path with the query string
                router.push(qs ? `${pathname}?${qs}` : pathname)
            })
        },
        [router, pathname]
    )

    // return the navigation context provider
    return (
        <NavigationContext.Provider value={{ isPending, navigateWithParams }}>
            {children}
        </NavigationContext.Provider>
    )
}

// function to use the navigation search
export function useNavigateSearch(): NavigationContextValue {
    // get the context
    const ctx = useContext(NavigationContext)
    if (!ctx) {
        throw new Error('useNavigateSearch must be used within NavigationProvider')
    }
    return ctx
}
