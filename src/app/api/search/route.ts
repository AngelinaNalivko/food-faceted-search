import { NextRequest, NextResponse } from 'next/server'
import { runSearch } from '@/lib/search/run-search'

// GET /api/search
export async function GET(request: NextRequest) {
    try {
        const data = await runSearch(request.nextUrl.searchParams)
        return NextResponse.json(data)
    } catch (error) {
        console.error('Search API error:', error)

        return NextResponse.json(
            { error: 'Failed to fetch search results' },
            { status: 500 }
        )
    }
}
