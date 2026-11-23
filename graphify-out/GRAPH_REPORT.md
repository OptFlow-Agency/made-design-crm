# Graph Report - made-design-crm  (2026-11-23)

## Corpus Check
- 132 files · ~330,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 956 nodes · 1372 edges · 50 communities (44 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e9d4384`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_checkRole|checkRole]]
- [[_COMMUNITY_payload-types.ts|payload-types.ts]]
- [[_COMMUNITY_theme.ts|theme.ts]]
- [[_COMMUNITY_DashboardView.tsx|DashboardView.tsx]]
- [[_COMMUNITY_Payload Plugin Development|Payload Plugin Development]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_Payload Ecommerce Template|Payload Ecommerce Template]]
- [[_COMMUNITY_Payload CMS Access Control Reference|Payload CMS Access Control Reference]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_Payload CMS Access Control - Advanced Patterns|Payload CMS Access Control - Advanced Patterns]]
- [[_COMMUNITY_Payload Field Type Guards Reference|Payload Field Type Guards Reference]]
- [[_COMMUNITY_importMap.js|importMap.js]]
- [[_COMMUNITY_Payload Custom API Endpoints Reference|Payload Custom API Endpoints Reference]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_Advanced Patterns|Advanced Patterns]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_Payload CMS Advanced Features|Payload CMS Advanced Features]]
- [[_COMMUNITY_Payload CMS Application Development|Payload CMS Application Development]]
- [[_COMMUNITY_payload.config.ts|payload.config.ts]]
- [[_COMMUNITY_Payload CMS Field Types Reference|Payload CMS Field Types Reference]]
- [[_COMMUNITY_AdminNav.tsx|AdminNav.tsx]]
- [[_COMMUNITY_modules.ts|modules.ts]]
- [[_COMMUNITY_idOf|idOf]]
- [[_COMMUNITY_tenantFields.ts|tenantFields.ts]]
- [[_COMMUNITY_components.json|components.json]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_Payload CMS Querying Reference|Payload CMS Querying Reference]]
- [[_COMMUNITY_Payload CMS Adapters Reference|Payload CMS Adapters Reference]]
- [[_COMMUNITY_Payload CMS Collections Reference|Payload CMS Collections Reference]]
- [[_COMMUNITY_admin.e2e.spec.ts|admin.e2e.spec.ts]]
- [[_COMMUNITY_Storage Adapters|Storage Adapters]]
- [[_COMMUNITY_Payload CMS Hooks Reference|Payload CMS Hooks Reference]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_.prettierrc.json|.prettierrc.json]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_Media.ts|Media.ts]]
- [[_COMMUNITY_CLAUDE|CLAUDE.md]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_import-export.seed.spec.ts|import-export.seed.spec.ts]]
- [[_COMMUNITY_tailwind.config.mjs|tailwind.config.mjs]]

## God Nodes (most connected - your core abstractions)
1. `checkRole()` - 29 edges
2. `scripts` - 23 edges
3. `Payload Ecommerce Template` - 22 edges
4. `compilerOptions` - 20 edges
5. `Payload CMS Field Types Reference` - 19 edges
6. `moduleAccess()` - 16 edges
7. `idOf()` - 15 edges
8. `Payload CMS Access Control Reference` - 15 edges
9. `DashboardView()` - 13 edges
10. `getActiveBranding()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `adminOrSelf()` --calls--> `checkRole()`  [EXTRACTED]
  src/access/adminOrSelf.ts → src/access/utilities.ts
- `isAdmin()` --calls--> `checkRole()`  [EXTRACTED]
  src/access/isAdmin.ts → src/access/utilities.ts
- `tenantIdsOf()` --calls--> `idOf()`  [EXTRACTED]
  src/access/manageStaff.ts → src/utilities/ids.ts
- `DashboardView()` --calls--> `canRead()`  [EXTRACTED]
  src/admin/dashboard/DashboardView.tsx → src/access/modules.ts
- `DashboardView()` --calls--> `canWrite()`  [EXTRACTED]
  src/admin/dashboard/DashboardView.tsx → src/access/modules.ts

## Import Cycles
- None detected.

## Communities (50 total, 6 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.07
Nodes (48): prepareOrder(), absoluteUrl(), allowedOrigins(), corsHeaders(), Handler, parseItems(), preflight(), resolveTenant() (+40 more)

### Community 1 - "checkRole"
Cohesion: 0.09
Nodes (32): adminOnly(), adminOnlyFieldAccess(), adminOrSelf(), adminOrStoreAdminFieldAccess(), isAdmin(), isStaff(), canCreateStaff(), deleteStaff() (+24 more)

### Community 2 - "payload-types.ts"
Cohesion: 0.04
Nodes (47): Auth, CategoriesSelect, Category, CollectionsWidget, Config, ContentSection, ContentSectionsSelect, Customer (+39 more)

### Community 3 - "theme.ts"
Cohesion: 0.10
Nodes (37): getActiveBranding(), getActiveTenant(), LoginTheme(), TenantLogo(), url(), TenantTheme(), ThemeStyle(), COLOR_KEYS (+29 more)

### Community 4 - "DashboardView.tsx"
Cohesion: 0.08
Nodes (40): AgencyOverview(), cap(), DashboardView(), Href, Ctx, Day, dayKey(), loadAgencyOverview() (+32 more)

### Community 5 - "Payload Plugin Development"
Cohesion: 0.05
Nodes (42): Adapter, Adding Fields to Collections, Adding Hooks, Adding New Collections, Adding Root-Level Endpoints, Admin Components, Best Practices, Client Components (+34 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (37): dependencies, class-variance-authority, clsx, cross-env, date-fns, dotenv, embla-carousel-auto-scroll, embla-carousel-react (+29 more)

### Community 7 - "Payload Ecommerce Template"
Cohesion: 0.06
Nodes (35): Access control, Cache, Clone, Collections, Currencies, Deploying to Vercel, Development, Development (+27 more)

### Community 8 - "Payload CMS Access Control Reference"
Cohesion: 0.06
Nodes (33): Access Control Function Arguments, Advanced Patterns, At a Glance, Auth Collection Patterns, Basic Field Access, Basic Patterns, Best Practices, Collection Access Control (+25 more)

### Community 9 - "scripts"
Cohesion: 0.06
Nodes (32): description, engines, node, license, name, pnpm, onlyBuiltDependencies, scripts (+24 more)

### Community 10 - "Payload CMS Access Control - Advanced Patterns"
Cohesion: 0.06
Nodes (32): Active Subscription Required, Async Operations Impact, Avoid N+1 Queries, Basic Authenticated Collection, Configuration Templates, Context-Aware Access Patterns, createOrgScopedAccess, createRoleBasedAccess (+24 more)

### Community 11 - "Payload Field Type Guards Reference"
Cohesion: 0.06
Nodes (32): Capability Guards, Common Patterns, Container Type Switching, Data Guards, fieldAffectsData, fieldHasMaxDepth, fieldHasSubFields, fieldIsArrayType (+24 more)

### Community 12 - "importMap.js"
Cohesion: 0.09
Nodes (12): importMap, Args, Args, Args, TenantIcon(), ItemImage(), Item, ItemRowLabel() (+4 more)

### Community 13 - "Payload Custom API Endpoints Reference"
Cohesion: 0.07
Nodes (30): addDataAndFileToRequest, addLocalesToRequestFromData, Advanced Patterns, Authentication Check, Best Practices, Collection Endpoints, Common Patterns, Conditional Endpoints (+22 more)

### Community 14 - "devDependencies"
Cohesion: 0.07
Nodes (29): devDependencies, eslint, eslint-config-next, @eslint/eslintrc, eslint-plugin-jsx-a11y, eslint-plugin-react, eslint-plugin-react-hooks, jsdom (+21 more)

### Community 15 - "Advanced Patterns"
Cohesion: 0.07
Nodes (28): Access Control & Filtering, Access Control Wrapper Pattern, Admin Folders Override, Admin UI Customization, Advanced Configuration, Advanced Hooks, Advanced Patterns, Async Plugin Function (+20 more)

### Community 16 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx (+18 more)

### Community 17 - "Payload CMS Advanced Features"
Cohesion: 0.08
Nodes (26): Admin Config, API Keys, Authentication, Available Plugins, Collection Endpoints, Core Configuration Types, Creating Plugins, Custom Components (+18 more)

### Community 18 - "Payload CMS Application Development"
Cohesion: 0.08
Nodes (26): 1. Local API Access Control (CRITICAL), 2. Transaction Failures in Hooks, 3. Infinite Hook Loops, Access Control with Type Safety, Basic Collection, Best Practices, Common Fields, Common Gotchas (+18 more)

### Community 19 - "payload.config.ts"
Cohesion: 0.09
Nodes (10): GET, ShippingZones, Testimonials, Users, dirname, filename, plugins, DEFAULT_BENEFITS (+2 more)

### Community 20 - "Payload CMS Field Types Reference"
Cohesion: 0.09
Nodes (22): Advanced Lexical Configuration, Array, Blocks, Collapsible (Layout), Conditional Fields, Field Type Guards, Geospatial Queries, Join Fields (+14 more)

### Community 21 - "AdminNav.tsx"
Cohesion: 0.15
Nodes (16): AdminNav(), media(), ROLE_LABEL(), AGENCY_ONLY, Def, IconName, NavLinkItem, NavSectionModel (+8 more)

### Community 22 - "modules.ts"
Cohesion: 0.18
Nodes (14): ALSO_READABLE_BY, ALSO_WRITABLE_BY, canRead(), canWrite(), hasFullAccess(), hiddenCollectionsFor(), manages(), moduleAccess() (+6 more)

### Community 23 - "idOf"
Cohesion: 0.20
Nodes (12): adjustStock(), Line, move(), RELEASED, linkCustomer(), refreshCustomerStats(), trackStatus(), ORDER_STATUSES (+4 more)

### Community 24 - "tenantFields.ts"
Cohesion: 0.21
Nodes (9): Categories, BENEFIT_ICONS, Products, PromoCodes, Stories, slugify(), tenantIdOf(), tenantSlugField() (+1 more)

### Community 25 - "components.json"
Cohesion: 0.14
Nodes (13): aliases, components, utils, rsc, $schema, style, tailwind, baseColor (+5 more)

### Community 27 - "Payload CMS Querying Reference"
Cohesion: 0.18
Nodes (11): Access Control in Local API, AND/OR Logic, GraphQL, Local API, Nested Properties, Payload CMS Querying Reference, Performance Best Practices, Query Operators (+3 more)

### Community 29 - "Payload CMS Adapters Reference"
Cohesion: 0.20
Nodes (10): Database Adapters, Email Adapters, MongoDB, Nodemailer (SMTP), Payload CMS Adapters Reference, Postgres, Resend, SQLite (+2 more)

### Community 30 - "Payload CMS Collections Reference"
Cohesion: 0.20
Nodes (9): Auth Collection, Basic Collection, Document Status, Draft API Usage, Globals, Live Preview, Payload CMS Collections Reference, Upload Collection (+1 more)

### Community 31 - "admin.e2e.spec.ts"
Cohesion: 0.39
Nodes (5): login(), LoginOptions, cleanupTestUser(), seedTestUser(), testUser

### Community 32 - "Storage Adapters"
Cohesion: 0.29
Nodes (7): AWS S3, Azure Blob Storage, Cloudflare R2, Google Cloud Storage, Storage Adapters, Uploadthing, Vercel Blob

### Community 33 - "Payload CMS Hooks Reference"
Cohesion: 0.29
Nodes (7): Collection Hooks, Date Field Auto-Set, Field Hooks, Hook Context, Hook Patterns Best Practices, Next.js Revalidation with Context Control, Payload CMS Hooks Reference

### Community 34 - "route.ts"
Cohesion: 0.29
Nodes (6): DELETE, GET, OPTIONS, PATCH, POST, PUT

### Community 35 - "next.config.ts"
Cohesion: 0.40
Nodes (4): dirname, __filename, nextConfig, redirects()

### Community 36 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 37 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 38 - "index.ts"
Cohesion: 0.60
Nodes (3): Customers, isValidMoroccanPhone(), normalizePhone()

### Community 39 - "Media.ts"
Cohesion: 0.50
Nodes (3): dirname, filename, Media

## Knowledge Gaps
- **537 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `$schema` (+532 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Payload Plugin Development` connect `Payload Plugin Development` to `Advanced Patterns`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Payload CMS Access Control Reference` connect `Payload CMS Access Control Reference` to `SKILL.md`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Payload CMS Access Control - Advanced Patterns` connect `Payload CMS Access Control - Advanced Patterns` to `SKILL.md`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _537 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `checkRole` be split into smaller, more focused modules?**
  _Cohesion score 0.09042553191489362 - nodes in this community are weakly interconnected._
- **Should `payload-types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._