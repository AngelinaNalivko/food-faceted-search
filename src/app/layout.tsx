import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NavigationProvider } from '@/components/navigation-provider'
import PendingBar from '@/components/pending-bar'
import './globals.css'

// define the geist sans font
const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

// define the geist mono font
const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

// define the metadata
export const metadata: Metadata = {
    title: 'Food Faceted Search',
    description: 'Search open food product data with brand and category facets.',
}

// define the root layout
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="flex min-h-full flex-col">
                <NavigationProvider>
                    <PendingBar />
                    {children}
                </NavigationProvider>
            </body>
        </html>
    )
}
