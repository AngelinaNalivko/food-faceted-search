# Food Faceted Search

A small Amazon-like faceted search application built with **Next.js**, **Node.js**, **Supabase Postgres**, and **Vercel**.

The project uses a subset of data from **Open Food Facts** (https://world.openfoodfacts.org/) and supports product search with multi-select filters, pagination, and URL-based state.

#### https://food-faceted-search.vercel.app/ - Link to the deployed application

## Features

- Partial text search by product name
- Multi-select Brand filter
- Multi-select Category filter
- Dynamic facet counts
- Pagination
- Search and filters reflected in the URL
- Deployed live application
- Search API used by the UI

## Project Structure

- `src/app` — pages and API routes
- `src/components` — UI components
- `src/lib` — shared helpers and search logic
- `src/types` — TypeScript types
- `scripts` — data import script

## Search API

The main API endpoint is:

```bash
/api/search
````

Supported query parameters:

* `q` — text query
* `brands` — comma-separated list of selected brands
* `categories` — comma-separated list of selected categories
* `page` — page number

Example:

```bash
/api/search?q=milk&brands=Nestle,Milka&categories=Snacks&page=2
```

## Running the Project Locally

### 1. Clone the repository

### 2. Install dependencies

```bash
npm install
```

### 3. Add environment variables

Create a `.env.local` file in the project root and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the development server

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000
```

## Database Setup

Create the `products` table in Supabase with fields for:

* barcode
* name
* image_url
* brand
* categories

## Importing Data

The project includes a Node.js import script that fetches product data from Open Food Facts and inserts it into Supabase.

Run:

```bash
npm run import:products
```

## Engineering Notes

The project also includes `ENGINEERING_NOTES.md`, which explains:

* stack choice
* data model decisions
* key tradeoffs
* future scaling ideas
* one non-trivial technical decision
