export default function Loading() {
    return (
        <main className="mx-auto max-w-7xl px-6 py-10">
            {/* title */}
            <div className="h-9 w-72 animate-pulse rounded-lg bg-gray-200" />

            {/* search bar */}
            <div className="mt-8 h-11 max-w-2xl animate-pulse rounded-lg bg-gray-100" />

            {/* main content */}
            <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
                <aside className="space-y-4">
                    {/* facet filters */}
                    <div className="h-64 animate-pulse rounded-xl border border-gray-100 bg-gray-50 p-4" />
                    {/* facet filters */}
                    <div className="h-64 animate-pulse rounded-xl border border-gray-100 bg-gray-50 p-4" />
                </aside>

                {/* product list */}
                <section className="space-y-4">
                    {/* total results */}
                    <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
                    {/* product list */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-40 animate-pulse rounded-xl border border-gray-100 bg-gray-50"
                            />
                        ))}
                    </div>
                </section>
            </div>

            {/* loading results */}
            <p className="mt-6 text-center text-sm text-gray-500">Loading results…</p>
        </main>
    )
}
