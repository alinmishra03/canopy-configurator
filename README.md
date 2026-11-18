# 10×10 Custom Canopy Configurator

A single-page product configurator for a printed 10×10 canopy tent. Customers choose the frame, side walls and half walls, color every panel, and place logos and text in a 2D editor. A live 3D model updates as they work. The server validates every price, the configuration exports to PDF, and the cart architecture targets the Shopify Storefront API. The app can be embedded in any site through an `<iframe>`.

> The product options follow the public 10×10 custom canopy listing on mvpvisuals.com. The interface, code, 3D model and **prices are original and for demonstration only** (see [Pricing](#dynamic-pricing)).

---

## Quick start

Requires **Node.js 18.18+** (developed on Node 24).

```bash
npm install
npm run dev          # API on :8787 + Vite on :5173 (proxies /api)
```

Open http://localhost:5173.

| Script | What it does |
| --- | --- |
| `npm run dev` | API (`tsx watch`) and Vite dev server together |
| `npm run build` | Strict typecheck (client + server) → Vite build → bundled server in `dist-server/` |
| `npm start` | Production: Express serves the API **and** the built SPA on `PORT` (default 8787) |
| `npm test` | Vitest: pricing engine, rules, serialization, store, API routes |
| `npm run typecheck` | `tsc --noEmit` for both tsconfigs |

Copy `.env.example` to `.env` to configure the server (Node loads it automatically).

---

## Features

| Area | Implementation |
| --- | --- |
| **Product options** | Size and frame (frame / canopy only / light-up frame), 5 side-wall options, 3 half-wall options, quantity. All come from catalog data (`shared/catalog`), not from UI code. |
| **Option rules** | Three full side walls and half walls both need the left/right sides. Picking one resets the other and shows a notice; the server rejects any configuration that still conflicts. |
| **Colors** | Canopy base color plus per-panel color overrides on 13 printable panels (4 roof faces, 4 valances, 3 walls, 2 half walls). |
| **2D editor** (React Konva) | Per-panel canvas clipped to the panel shape (roof triangles, rectangles). Add/edit text (font, weight, size, color), upload logos (PNG/JPG/WebP/SVG), drag, corner-resize, rotate (snapping), layer order, duplicate, delete, copy a design to sibling panels, clear a panel. |
| **3D preview** (R3F + drei) | Procedural model: legs, scissor trusses, roof struts, 4 textured roof faces, valances, walls, half walls with rails, LED strips for the light-up frame, and a faint reference frame for "canopy only". Orbit, zoom buttons, auto-rotate, reset, soft shadows, render-on-demand. Click a panel to select it for editing. |
| **2D ↔ 3D sync** | One Zustand store. Each 3D panel texture is drawn from the same element data the Konva editor edits, and redraws live while you drag. |
| **Undo/redo** | Store-level history. A drag or slider gesture counts as one undo step, and rapid edits (typing, color dragging) are merged. Ctrl/Cmd+Z, Ctrl+Shift+Z / Ctrl+Y, Delete, Esc. |
| **Pricing** | Server-side engine and price book. Itemized lines by category, volume discounts, debounced quote requests that cancel stale ones, plus loading, error/retry and validation-issue states. |
| **Save / restore** | Automatic local draft; **Save link** stores the design on the server and copies `?config=CNP-XXXX-XXXX`; JSON export/import from the header. |
| **PDF** (jsPDF) | Product name, configuration ID, options, colors, 3D snapshot, itemized server pricing, every panel rendered with its artwork, uploaded logo thumbnails, page footer with the order reference. |
| **Shopify** | Server-side adapter pattern: a **mock** adapter (default, labeled as mock everywhere) and a **Storefront API** adapter (`cartCreate` / `cartLinesAdd`) used when credentials are set. |
| **Embedding** | No `X-Frame-Options`; `Content-Security-Policy: frame-ancestors` is configurable. `postMessage` events go to the host page. |
| **Responsive** | Desktop: 3 columns (options · preview · summary). Below `lg`: preview first, then options, then summary, with a sticky price and Add to Cart bar. No horizontal overflow at 390px. |

---

## Architecture

```
shared/                     Code used by BOTH browser and server
  types/                    Product, ProductVariant, ProductSection, Customization,
                            UploadedAsset, DesignElement, PricingOption, Quote,
                            ProductConfiguration, CartItem, Cart ...
  catalog/                  Product registry (canopy10x10.ts) — options, panels, rules, palette
  configuration/            rules (active panels, conflicts), factory, serialization,
                            validation, human-readable summaries
  utils/                    ids, formatting

server/
  index.ts / app.ts         Express app factory (testable), static SPA hosting in production
  routes/                   /api/pricing, /api/configurations, /api/cart
  services/
    pricingEngine.ts        Authoritative quote calculation (pure function)
    configurationParser.ts  Untrusted JSON → typed configuration (400/404)
    configurationRepository.ts  File-based store (swap for a DB)
    shopify/                ShopifyAdapter port, mock + Storefront adapters, cart-line builder
  middleware/               Error handling, iframe/embed headers
  config/                   priceBook.ts (MOCK prices), shopifyVariantMap.ts

src/
  store/                    configurationStore (single source of truth + history),
                            selectors, uiStore (transient UI), commerceStore (quote, cart)
  services/                 apiClient, pricingService, configurationService,
                            shopifyService, pdfService
  components/
    configurator/           Sidebar, option cards, color options, panel picker, design tools
    editor/                 Konva DesignCanvas, DesignEditor2D, ElementInspector
    preview/                PreviewStage, ProductViewer3D, scene/ (model, frame, textures)
    pricing/                SummaryPanel, PriceBreakdown, CartDrawer, MobileCheckoutBar
    common/                 Buttons, color picker, sliders, toasts, header
  hooks/                    Pricing sync, persistence, uploads, keyboard shortcuts
  utils/                    panelRenderer (canvas rasterizer), text metrics, image cache,
                            upload optimization, iframe messaging
  types/                    Re-exports of shared types
tests/                      Vitest suites
public/embed-demo.html      Example host page embedding the configurator
```

**Why a `shared/` folder?** The browser shows instant validation feedback, and the server must enforce the same rules. Sharing the catalog, rules and validation keeps them identical. The **price book and pricing engine live only in `server/`**, so prices never ship in the client bundle.

### State model

```
ProductConfiguration  (persistent, serializable JSON)
├─ selections   { size, sideWalls, halfWalls }   sectionId → variantId
├─ quantity
├─ colors       { base, panels: { [panelId]: hex } }
├─ designs      { [panelId]: DesignElement[] }   normalized coordinates (0..1)
└─ assets       { [assetId]: UploadedAsset }     optimized data URLs
```

- Element positions are **normalized to the panel** (x, y = center as a fraction of width/height). Text size is a fraction of panel height, and image width a fraction of panel width. The same numbers drive the Konva stage at any zoom, the 1200px Three.js textures and the PDF previews.
- `uiStore` holds selection, view mode and toasts; `commerceStore` holds quote and cart. **Neither is saved** with the configuration.
- Pure, framework-free `panelRenderer.ts` rasterizes a panel. Both the 3D textures and the PDF use it, so they always match.
- `schemaVersion` plus `deserializeConfiguration()` (structural validation and a migration hook) make saved designs forward-compatible. Unused uploads are pruned automatically.

---

## Dynamic pricing

`POST /api/pricing/quote` → `Quote` (itemized lines, unit price, subtotal, discount, total, validation issues).
`GET /api/pricing/options/:productId` → per-option display prices, used for the "+$248" labels.

Each variant lists priced **components** (SKUs); the server resolves them against the price book. Customization charges come from the configuration itself: one per panel whose color differs from the base, one per unique uploaded file that is actually printed.

**Sample price book (`server/config/priceBook.ts`, version `mock-2026.11`)** — not real retail prices:

| SKU | Item | Price |
| --- | --- | ---: |
| CAN-TOP-10 | 10×10 canopy top with 4 valances | $389 |
| PRINT-TOP-10 | Dye-sublimation print, roof + valances | $260 |
| FRAME-HEX-10 | Commercial aluminum hex frame | $499 |
| FRAME-LED-10 | Light up LED frame | $899 |
| WALL-FULL-10 | 10ft full side wall (each) | $149 |
| PRINT-WALL-SS / DS | Side wall print, single / double sided (each) | $99 / $189 |
| WALL-HALF-10 | 10ft half wall with rail (each) | $119 |
| PRINT-HALF-SS / DS | Half wall print, single / double sided (each) | $59 / $109 |
| CUSTOM-PANEL-COLOR | Per panel with a custom color | $15 |
| CUSTOM-ARTWORK-SETUP | Per unique uploaded artwork file | $25 |
| Volume discount | 3+ units / 5+ units | 5% / 10% |

Resulting totals: canopy with frame **$1,148**, canopy only **$649**, light-up **$1,548**. One wall adds +$248 (single) or +$338 (double); three walls +$744 / +$1,014; half walls +$356 / +$456.

**Trust model:** the browser only displays quotes. When adding to the cart it sends the configuration and the total the customer saw. The server re-validates, recalculates and answers **409 `price_changed`** (with the fresh quote) on any mismatch, or **422** if the configuration is invalid.

---

## Shopify integration

Flow implemented by `POST /api/cart/items`:

1. The customer configures options (client store).
2. The configuration is serialized and sent to the server (with artwork, so the order can be produced).
3. The server parses and validates it, then **recalculates the price** and compares it with `expectedTotal`.
4. It saves the configuration (`server/data/configurations/CNP-….json`) and gets a shareable URL.
5. `buildCartItem()` maps every quote line to a **Shopify ProductVariant GID** (`shopifyVariantMap.ts`) with quantity, and attaches attributes:
   - visible on the order: `Size & Frame`, `Side Walls`, `Half Walls`, `Canopy Color`, `Custom Panels`, `Artwork Files`, `Configuration`
   - hidden (underscore): `_configuration_id`, `_configuration_url`, `_price_book`, `_bundle_role`
6. The adapter creates or extends the cart (`cartCreate` / `cartLinesAdd`) and returns `checkoutUrl`.

Why one line per priced component? The Storefront API cannot set arbitrary line prices. Each component (top, frame, wall, print, setup fee) is therefore a real Shopify variant priced identically to the price book, and the lines are bundled by `_configuration_id`. Volume discounts belong in a Shopify automatic discount; alternatives for bigger stores are Cart Transform functions or Draft Orders.

### Modes

| Mode | When | Behavior |
| --- | --- | --- |
| **Mock** (default) | `SHOPIFY_STORE_DOMAIN` unset | In-memory cart on the local server, fake `MOCK-…` variant GIDs, `checkoutUrl: null`. The cart drawer states clearly that no store is connected and shows the exact Storefront request that *would* be sent. Checkout is disabled, not faked. |
| **Storefront** | `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_TOKEN` set | Real GraphQL calls to `https://{domain}/api/{version}/graphql.json` with the `Shopify-Storefront-Private-Token` header. Requires `SHOPIFY_VARIANT_MAP` (JSON SKU → GID; startup fails if any SKU is missing). |

Credentials are read only by the Node server and are never bundled into or sent to the browser.

---

## iframe embedding

```html
<iframe
  src="https://your-configurator-domain.com"
  width="100%"
  height="900"
  frameborder="0"
  allowfullscreen
  title="Canopy configurator"
></iframe>
```

- The server sends **no `X-Frame-Options`** and sets `Content-Security-Policy: frame-ancestors <FRAME_ANCESTORS>`. The default is `*`; restrict it in production, e.g. `FRAME_ANCESTORS="https://shop.example.com https://*.myshopify.com"`.
- The page fits within the iframe height. Below 1024px wide it switches to the stacked mobile layout and scrolls internally.
- **Events posted to the parent window** (`window.addEventListener('message', ...)`):
  - `{ type: 'canopy:ready', productId }`
  - `{ type: 'canopy:quote', configurationId, total, currency }`
  - `{ type: 'canopy:cart', configurationId, cartId, checkoutUrl }`

  Add `?parentOrigin=https://shop.example.com` to the iframe `src` to restrict the message target origin (default `*`; messages contain no secrets).
- Optional query parameters: `?config=CNP-XXXX-XXXX` (load a saved design), `?product=<id>` (another catalog product).
- Checkout links open in a new tab, because many checkouts refuse to render inside iframes.
- Demo host page: **http://localhost:5173/embed-demo.html** (logs the posted events).

---

## Testing

```bash
npm test
```

| Scenario | Covered by |
| --- | --- |
| Each product variant priced | `tests/server.pricing.test.ts` |
| Adding/removing side walls and half walls, rule conflicts | `server.pricing`, `configuration.test.ts`, `store.test.ts` |
| Colors (base + panel overrides, pricing only for active panels) | `store.test.ts`, `server.pricing` |
| Image upload, asset pruning, artwork fees | `store.test.ts`, `server.pricing` |
| Adding/moving text, drag = one undo step, clamping | `store.test.ts` |
| 2D/3D share one state object | `store.test.ts` |
| Price updates, discounts, invalid configurations | `server.pricing`, `server.api.test.ts` |
| Save/restore, serialization round trip, malformed input | `configuration.test.ts`, `server.api` |
| Mock Shopify cart (cartCreate → cartLinesAdd, attributes, 409/422) | `server.api.test.ts` |
| iframe headers | `server.api.test.ts` |

The browser flows were also checked end-to-end in headless Chrome against the dev server: variants and totals, wall/half-wall conflict, colors, adding text, uploading a logo, dragging on the Konva canvas, undo, 3D rendering, PDF download, save link and restore, mock cart drawer, no overflow at 390px, iframe rendering and `postMessage`. That script is not part of the repo; adding Playwright to CI is a natural next step.

---

## Design decisions & limitations

- **Procedural 3D model** — no licensed GLB model of this tent was available, so the canopy is built from Three.js geometry. A GLB can replace `CanopyModel` without touching state, as long as the model has named meshes per panel with matching UVs.
- **Mock prices and a mock Shopify adapter by default**, as described above. Nothing claims to be a live connection.
- **Artwork as data URLs** inside the configuration keeps the system self-contained. For production, upload originals to object storage (S3/R2/Shopify Files) and store URLs; this is a change in `UploadedAsset`. Uploads are downscaled to 1600px, so print-resolution files would come from that original upload.
- **File-based configuration storage** (`server/data/`, git-ignored) is meant for development and demos. Swap `FileConfigurationRepository` for a database.
- **Mock carts are in memory** and reset when the server restarts.
- Text is rendered with web fonts (Inter, Montserrat, Oswald, Playfair Display) loaded from Google Fonts. The PDF uses the rendered panel images, so it does not depend on embedding those fonts.
- Half walls are placed on the left and right sides. Combining them with three full walls is treated as a conflict; the real product may support other placements.
- The bundle is code-split (3D, editor and PDF load lazily). The Three.js chunk is ~270 KB gzipped.
