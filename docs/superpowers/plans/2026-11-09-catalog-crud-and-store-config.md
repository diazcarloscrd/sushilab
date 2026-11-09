# Catalog CRUD and Scalable Store Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CRUD for Categories and Products in Yankun Sushi Lab, with dynamic category filtering in the client menu, and a comprehensive real-time store configuration module for the business owner.

**Architecture:** Next.js 15 App Router with Prisma & Supabase PostgreSQL. Route handlers for categories, products, and settings with role-based auth (`getAdminSession`), data validation, and transactional integrity (soft delete safeguards). Client menu and admin dashboards built with Tailwind CSS and responsive Shokunin visual design.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma 5, Supabase PostgreSQL, Vitest.

**Spec:** Multi-agent factory specifications (`c:\Users\Carlos Diaz\Desktop\FABRICA-DE-SOFTWARE-13-AGENTES\AGENTES`) and Grill-me requirements.

## Global Constraints

- Do not break existing API contracts or Prisma schema enums.
- Use `cmd /c npm test` or `cmd /c npm run build` on Windows PowerShell environment.
- Preserve Shokunin Japanese aesthetic and theme tokens (`bg-surface`, `text-primary`, `bg-surface-container`, etc.).
- Protect destructive actions with confirmation and soft-delete safeguards (no deleting categories with active products).

## Review Focus

- Prevent deleting a category that still contains products (returns 400 Bad Request with informative message).
- Loading a product for editing via `?id=...` must prefill all fields accurately (tags, category, cost, price, description, images).
- Product updates via `PATCH` must update all provided fields (`name`, `description`, `price`, `costPrice`, `stock`, `piecesCount`, `categoryId`, `image`, `dietaryTags`, `modifiersJson`, `active`).
- Store settings (`KITCHEN_ESTIMATED_TIME_MIN`, `TOP_ANNOUNCEMENT_BANNER`, `MIN_ORDER_AMOUNT`, `PAYMENT_*`, `INSTAGRAM_URL`, `WHATSAPP_MESSAGE_TEMPLATE`) must persist in `StoreSetting` and be served via public settings API.
- Client menu must dynamically render categories as quick filter pills and display the top alert banner when configured.

---

### Task 1: Category API & Business Logic Validation (Agent 03 & 07)

**Files:**
- Modify: `src/app/api/categories/route.ts`
- Test: `src/lib/catalog/categories.test.ts`

- [ ] Write unit test for category slug generation and validation rules.
- [ ] Implement `POST /api/categories` with admin session check, slug generation, name and order validation.
- [ ] Implement `PATCH /api/categories` with admin session check, partial update of name, order, active, and imageUrl.
- [ ] Implement `DELETE /api/categories?id=...` with validation blocking deletion if active products exist in the category.
- [ ] Run test suite with `cmd /c npm test` and ensure all tests pass.

### Task 2: Enhanced Product API & Single Product Retrieval (Agent 03 & 04)

**Files:**
- Modify: `src/app/api/admin/products/route.ts`
- Test: `src/lib/catalog/products.test.ts`

- [ ] Write unit test verifying payload validation and slug generation for products.
- [ ] Update `GET /api/admin/products` to accept `?id=...` parameter and return a single product with full category relation.
- [ ] Update `PATCH /api/admin/products` to accept and update all product fields (`categoryId`, `image`, `piecesCount`, `dietaryTags`, `modifiersJson`, `costPrice`, etc.).
- [ ] Update `DELETE /api/admin/products?id=...` to safeguard existing order history or soft-delete.
- [ ] Run test suite with `cmd /c npm test` and verify.

### Task 3: Store Configuration API Expansion (Agent 01 & 07)

**Files:**
- Modify: `src/app/api/admin/settings/route.ts`
- Modify: `src/app/api/settings/public/route.ts`

- [ ] Expand `/api/admin/settings` to handle operational keys (`KITCHEN_ESTIMATED_TIME_MIN`, `TOP_ANNOUNCEMENT_BANNER`, `MIN_ORDER_AMOUNT`, `PAYMENT_MP_ENABLED`, `PAYMENT_TRANSFER_ENABLED`, `PAYMENT_CASH_ENABLED`, `INSTAGRAM_URL`, `WHATSAPP_MESSAGE_TEMPLATE`).
- [ ] Expose these safe keys in `src/app/api/settings/public/route.ts`.
- [ ] Verify endpoints with unit test or direct route execution.

### Task 4: Admin Catalog UI - Categories Tab & Inline Table Edits (Agent 02 & 05)

**Files:**
- Modify: `src/app/(admin)/admin/catalogo/page.tsx`

- [ ] Add 4th tab: "Categorías" in catalog navigation.
- [ ] Implement category list table with order, name, slug, product counter, active toggle, edit modal/inline and delete action with warnings.
- [ ] Implement quick inline price, stock, and active toggle in the "Productos del Menú" tab.
- [ ] Add toast/feedback notifications for success and error states.

### Task 5: Admin Product Editor Dual Mode (Agent 04 & 05)

**Files:**
- Modify: `src/app/(admin)/admin/catalogo/nuevo/page.tsx`

- [ ] Read `id` query parameter using `useSearchParams`.
- [ ] Fetch product details if `id` is present and set form state into "Editar Pieza de Autor".
- [ ] Support image URL input or selection, dietary tags, category selector, pieces count, food cost calculations.
- [ ] Submit `PATCH` when editing or `POST` when creating new product.
- [ ] Add "Eliminar Producto" button when in edit mode with confirmation modal.

### Task 6: Store Configuration UI Expansion (Agent 02 & 05)

**Files:**
- Modify: `src/app/(admin)/admin/configuracion/page.tsx`

- [ ] Add "Operación y Avisos" section (Tiempo de cocina estimado, Banner de aviso, Pedido mínimo).
- [ ] Add "Métodos de Pago" section with toggles for MP, Transferencia, and Efectivo.
- [ ] Add "Redes y Canales de Contacto" (Instagram, WhatsApp).
- [ ] Save all parameters seamlessly to `/api/admin/settings`.

### Task 7: Client Menu Dynamic Category Filtering & Announcement Banner (Agent 02 & 12)

**Files:**
- Modify: `src/app/(client)/menu/page.tsx`
- Modify: `src/app/(client)/page.tsx`

- [ ] Fetch `/api/categories` in menu and render category pills alongside dietary filters.
- [ ] Filter products smoothly when clicking on category pills.
- [ ] Fetch public settings and render the top announcement banner if `TOP_ANNOUNCEMENT_BANNER` is configured.
- [ ] Show estimated kitchen preparation time in header/banner.

### Task 8: QA Verification & Build Check (Agent 06, 08 & 09)

**Files:**
- Test: All tests in `src/`
- Command: `cmd /c npm test`
- Command: `cmd /c npm run build`

- [ ] Run full vitest test suite.
- [ ] Run Next.js production build check.
- [ ] Verify 0 linting/type errors.

### Task 9: Git Commit, Push & Deployment (Agent 09 & 11)

**Files:**
- Repo root

- [ ] Commit all changes with clear descriptive conventional commits.
- [ ] Push to `origin main` on GitHub (`https://github.com/diazcarloscrd/sushilab.git`).
- [ ] Check deployment triggers or status.
