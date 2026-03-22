import { Product } from '@/types/product'

// props for the product list component
type ProductListProps = {
    items: Product[]
}

// product list component
export default function ProductList({ items }: ProductListProps) {
    // if no products are found, show a placeholder
    if (items.length === 0) {
        return (
            <div className="rounded-xl border p-6 text-center text-gray-500">
                No products found.
            </div>
        )
    }

    // return the product list component
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
                // product card
                <article
                    key={product.barcode}
                    className="rounded-xl border p-4 shadow-sm"
                >
                    {/* product image */}
                    <div className="flex items-start gap-4">
                        {/* if there is an image, show it */}
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-20 w-20 rounded-md object-cover"
                            />
                        ) : (
                            // show a placeholder if there is no image
                            <div className="flex h-20 w-20 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                                No image
                            </div>
                        )}

                        {/* product name */}
                        <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 font-semibold">
                                {product.name}
                            </h3>

                            {/* product brand */}
                            <p className="mt-1 text-sm text-gray-600">
                                Brand: {product.brand || 'Unknown'}
                            </p>

                            {/* product barcode */}
                            <p className="mt-1 text-xs text-gray-500">
                                Barcode: {product.barcode}
                            </p>
                        </div>
                    </div>

                    {/* product categories */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {/* show the first 4 categories to keep cards compact */}
                        {product.categories.slice(0, 4).map((category) => (
                            // category tag 
                            <span
                                key={category}
                                className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                            >
                                {category}
                            </span>
                        ))}
                    </div>
                </article>
            ))}
        </div>
    )
}
