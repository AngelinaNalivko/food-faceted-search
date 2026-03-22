### Why this stack
I chose Next.js + Node.js + Supabase + Vercel because this stack allows to avoid creating unnecessary complex infrastructure. Next.js combines the UI and API into a single codebase, and Node.js is used to write the data import script. When selecting the stack, I also considered the need to integrate Supabase and Vercel, so I evaluated how all the technologies would interact with each other. There was no need for a more advanced stack, since building a large-scale frontend wasn’t required, and deploying it separately would add complexity.

### Dataset 
The data is stored in one table, which includes barcode (primary key), name, image, brand and list of categories. Compared to using multiple tables with joins, I chose a single-table structure to avoid overcomplicating. 

Also, I've noticed that data is quite dirty since it is open-source, so for the future development and serious use of this dataset it needs data cleaning. In my app, I stopped at basic normalization, since deeper data cleaning was not required. 

### Key tradeoffs 
1. Keeping the open-source data mostly as it is.
2. Simplification at the expense of performance: 
facet counts are computed in application logic, instead of using more advanced SQL aggregation queries.
3. Focus on search logic over perfect UI and appearance: frontend was kept as easy as possible without even custom formatting and styling.
4. Limiting the filter lists: the number of displayed facet values is limited (to 100) in order to avoid very long sidebars full of low-quality values with only one or two matching products.
5. Slow application speed: in reality people have much more than 10k products, which emphasizes that my solution is not efficient for real-world use.

### Future scaling 
1. Normalize facet data (separate tables, removing errors and duplicates, using joins)
2. Move more work into SQL (compute facet counts with SQL aggregations, avoid scanning large result sets in Node.js when the amount of data becomes much bigger)
3. Improve search (e.g. replace `%` `ilike` with Postgres full-text (`tsvector`) or `pg_trgm` for relevance and index use)
4. Add caching of common queries and precomputation popular facet counts

### Non-trivial technical decision
One non-trivial decision was separating the filtering logic for the result list from the filtering logic for facet counts. The result list uses all active filters, but each facet excludes its own self-filter when computing counts. For example, brand counts are calculated using the current search query and category filter, but not the currently selected brands themselves. The same idea is applied in the opposite direction for categories. This keeps the filter panel useful, because users can still see alternative options. 

Another important edge case was handling zero-result facet values. Non-selected values with zero matching products should be hidden to reduce noise, but selected values should remain visible (pinned to the top of the list) even if their current count becomes zero, so the user can still remove them easily.
