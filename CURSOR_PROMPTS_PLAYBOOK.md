# Luxselle Dashboard — Cursor Agent Prompts Playbook

> Copy-paste these prompts into Cursor Agent mode (Cmd+I → Agent) to polish each area.
> Work through them in order. Commit after each prompt completes.
> Use Plan Mode (Shift+Tab) on larger prompts to review the agent's approach first.

---

## SETUP: Before You Start

1. Place the `.cursor/rules/luxselle-polish.mdc` file in your project (already done)
2. In Cursor, enable Agent mode (Cmd+I, select "Agent")
3. For each prompt below: paste it → let the agent plan → approve the plan → let it execute
4. After each change: review the diff, test in browser, commit if good

---

## PROMPT 1: DockBar — Animated Active Pill + Entrance Animation

```
Improve the DockBar navigation component at src/components/navigation/DockBar.tsx.

Current state: Fixed left sidebar with icons, tiny 4px active dot, tooltips on hover.

Changes needed:
1. Replace the tiny active dot indicator with a sliding pill background behind the active icon. Use a `motion.div` with `layoutId="nav-active-pill"` from framer-motion so it animates smoothly between nav items. The pill should be `bg-lux-100 rounded-[14px]` and sit behind the icon.

2. Add entrance stagger animation: On first mount, each nav icon should slide in from the left with opacity 0→1, staggered by 50ms. Use framer-motion's `motion.div` with `initial={{ opacity: 0, x: -12 }}` and `animate={{ opacity: 1, x: 0 }}` with a stagger delay.

3. Add focus-visible ring to all NavLinks: `focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:ring-offset-2 focus-visible:outline-none`

4. Logo: Add a subtle scale animation on hover (`hover:scale-110 transition-transform duration-200`) and remove the static opacity-70 — make it full opacity with a gold tint on hover.

5. Keep all existing functionality (prefetch on hover, aria-labels, tooltip on hover).

Install framer-motion if not already installed: `npm install framer-motion`
Run `npm run typecheck` after changes.
```

---

## PROMPT 2: Page Transitions — Fade + Slide

```
Add smooth page transitions to route changes in the Luxselle app.

Files to modify: src/LuxselleApp.tsx (where routes are rendered)

Implementation:
1. Install framer-motion if not already installed
2. Wrap the route outlet (where page components render) with framer-motion's AnimatePresence
3. Create a PageTransition wrapper component that each lazy-loaded page uses:
   - Enter: opacity 0→1, y: 8→0, duration 300ms, ease [0.16, 1, 0.3, 1]
   - Exit: opacity 1→0, duration 150ms
4. Apply this wrapper in the route definitions or in each page's top-level component
5. Make sure Suspense fallback (skeleton) also fades out smoothly

The transitions should feel subtle and fast — like iOS page transitions, not flashy.
Respect prefers-reduced-motion by checking `window.matchMedia('(prefers-reduced-motion: reduce)')`.
Run `npm run typecheck` after.
```

---

## PROMPT 3: Input Fields — Floating Labels + Better Selects

```
Polish all form inputs across the Luxselle dashboard for a premium feel.

Files to modify:
- src/components/design-system/Input.tsx
- src/styles/index.css (.lux-input styles)
- src/pages/MarketResearch/MarketResearchView.tsx
- src/pages/BuyBox/EvaluatorView.tsx

Changes:
1. **Floating labels**: Create a new `FloatingInput` component in design-system that:
   - Shows the label as a placeholder initially
   - On focus or when the input has a value, the label animates up to the top-left (translate + scale from 14px to 11px)
   - Uses CSS transitions, not JS, for performance
   - Maintains the gold focus ring from .lux-input

2. **Input transitions**: Add `transition-all duration-200` to .lux-input for smooth border color and shadow changes on focus

3. **Better select styling**: The native <select> elements look out of place in the luxury UI. Create a `LuxSelect` component that:
   - Uses a custom dropdown (you can use a simple div-based dropdown, no need for Radix)
   - Matches the .lux-input styling (14px radius, gold focus ring)
   - Has a chevron-down icon that rotates on open
   - Supports keyboard navigation (arrow keys, enter, escape)
   - Animate dropdown open: scaleY 0→1 from top, opacity 0→1, duration 200ms

4. **Error shake**: When Input has error=true prop, add a CSS shake animation (3px left-right, 300ms)

Apply FloatingInput and LuxSelect to the Market Research form as a showcase. Keep existing Input component for backwards compatibility.
Run typecheck after.
```

---

## PROMPT 4: Button Polish — Loading States + Icon Animations

```
Enhance the Button component at src/components/design-system/Button.tsx for production polish.

Current: Supports primary/secondary/ghost variants with basic hover/active.

Add these features:
1. **isLoading prop**: When true, show a Loader2 spinner (from lucide-react) spinning next to the text, disable the button, and reduce opacity to 0.7. The spinner should fade in (opacity animation).

2. **Size variants**: Add size prop with 'sm' | 'md' | 'lg':
   - sm: h-8 px-3 text-xs gap-1.5
   - md: h-10 px-4 text-sm gap-2 (current default)
   - lg: h-12 px-6 text-base gap-2.5

3. **Icon hover animations**: If the button contains a child icon (detect by checking children), add `group` class to button and `group-hover:translate-x-0.5 transition-transform` to icons that indicate direction (arrows, chevrons). For sparkle/star icons, add `group-hover:rotate-12 transition-transform`.

4. **Success flash**: Add an optional `flashSuccess` prop. When true for a moment, the button briefly shows a green border + checkmark, then returns to normal. Useful after save actions.

5. **Improved active state**: On mousedown, scale(0.97) with a spring-like transition.

6. Update the CSS in index.css:
   - .lux-btn-primary: Add `transition: all 0.15s ease` (currently only has individual transitions)
   - Add .lux-btn-primary.loading state

Keep backward compatible. Run typecheck.
```

---

## PROMPT 5: Saved Research Feature — Backend

```
Implement the saved research feature backend for Luxselle.

Context: Users want to save market research results so they can review them later, star favorites, and delete ones they don't need.

1. Create shared schema in packages/shared/src/schemas/savedResearch.ts:
   - SavedResearchSchema with: id, userId, brand, model, category, condition, result (the full MarketResearchResult), starred (boolean, default false), notes (optional string), createdAt, updatedAt
   - CreateSavedResearchSchema (omit id, timestamps — server generates these)
   - UpdateSavedResearchSchema (partial: starred, notes)

2. Create repo in packages/server/src/repos/savedResearchRepo.ts:
   - Extend BaseRepo pattern used by other repos
   - Firestore collection: 'saved_research'
   - Methods: create, findById, findAll (with optional starred filter), update, softDelete

3. Create service in packages/server/src/services/savedResearchService.ts:
   - save(userId, data) — validates with Zod, creates in Firestore
   - list(userId, filters) — returns all or starred only, sorted by createdAt desc
   - getById(userId, id) — returns single result
   - toggleStar(userId, id) — flips starred boolean
   - delete(userId, id) — soft delete (sets deletedAt timestamp)

4. Create routes in packages/server/src/routes/savedResearch.ts:
   - POST /api/saved-research — save research
   - GET /api/saved-research — list all (?starred=true for filter)
   - GET /api/saved-research/:id — get single
   - PATCH /api/saved-research/:id — update (star/notes)
   - DELETE /api/saved-research/:id — delete

5. Register routes in the Express app.

Follow existing patterns from other routes (e.g., inventory, sourcing). Use Zod validation middleware. Run `npm test` after.
```

---

## PROMPT 6: Saved Research Feature — Frontend

```
Build the Saved Research frontend page and save functionality.

1. **New page**: Create src/pages/SavedResearch/SavedResearchView.tsx
   - Add route '/saved-research' in routeMeta.ts under the 'check' section, with Bookmark icon from lucide-react
   - Page layout using PageLayout variant="content" and PageHeader

2. **Page content**:
   - Filter bar at top: "All" | "Starred" toggle buttons (pill style), plus a brand dropdown filter
   - Grid of SavedResearchCard components (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
   - Each card shows:
     - Brand + Model as title
     - Recommendation badge (reuse the color config from MarketResearchView)
     - Market value price
     - Date saved (relative: "2 days ago")
     - Star button (top-right, animated: filled gold star when starred, outline when not, scale bounce on toggle)
     - Delete button (trash icon, requires confirmation via ConfirmationModal)
   - Click on card → navigates to detail view or opens a Drawer with the full research result
   - Empty state: Bookmark icon + "No saved research yet" + "Research an item to save it here"

3. **Save action on MarketResearchView**:
   - After research results load, show a "Save" button (Bookmark icon) in the recommendation banner top-right
   - On save: POST to /api/saved-research, show success toast "Research saved", button changes to filled bookmark
   - Also add a small star icon next to Save that allows starring immediately

4. **API integration**: Use apiGet/apiPost/apiPut/apiDelete from src/lib/api.ts

5. **Animations**:
   - Cards enter with stagger animation (bento-enter pattern)
   - Star toggle: scale 1→1.3→1 bounce
   - Delete: card fades out and collapses (height animation)

Run typecheck. The page should be lazy-loaded like other pages.
```

---

## PROMPT 7: AI Feature — Typewriter Summary + Smart Suggestions

```
Add two AI-powered features to the Market Research results page at src/pages/MarketResearch/MarketResearchView.tsx.

1. **AI Executive Summary with Typewriter Effect**:
   - After the research result loads, show an "AI Summary" section at the very top of the results panel (above the recommendation banner)
   - Display the `marketSummary` field with a typewriter animation: characters appear one by one, 20ms per character
   - Create a reusable `TypewriterText` component in design-system:
     - Props: text (string), speed (ms per char, default 20), onComplete callback
     - Uses requestAnimationFrame for smooth rendering
     - Shows a blinking cursor (|) at the end while typing, hides when done
     - Respects prefers-reduced-motion (show full text immediately)
   - Style: text-sm text-lux-700, with a subtle Sparkles icon and "AI Analysis" label above it
   - Add a faint animated gradient border on the AI summary card (left border, gold to transparent)

2. **Smart Suggestions ("Also Check")**:
   - After results load, show a "AI suggests also checking" section below the comparables
   - Display 2-3 related items as clickable chips based on the current brand/model:
     - Same brand, different model (e.g., if Chanel Classic Flap → suggest Chanel Boy, Chanel 19)
     - Competing brand, same tier (e.g., if Chanel Classic Flap → suggest Hermès Constance)
   - Use the BRAND_MODELS data already in the file to generate suggestions client-side
   - Each chip: rounded-full border border-lux-200 px-3 py-1.5, with a Sparkles micro-icon
   - Clicking a chip calls quickResearch() to pre-fill the form
   - Chips enter with stagger fade-in, 100ms apart

Keep the component clean. Extract the typewriter into its own file. Run typecheck.
```

---

## PROMPT 8: AI Confidence Gauge + Dashboard Widget

```
Add two more AI showcase features to Luxselle.

1. **Radial Confidence Gauge** (replace plain percentage in MarketResearchView):
   - Create `ConfidenceGauge` component in src/components/design-system/
   - Animated SVG circle that draws from 0 to the confidence percentage on mount
   - Colors: red (<50%), amber (50-75%), emerald (>75%)
   - Large number in the center with AnimatedNumber
   - "Confidence" label below
   - Size: 100px diameter
   - Animation: 800ms ease-out, stroke-dashoffset technique
   - Replace the current text-only confidence display in the recommendation banner

2. **AI Market Pulse Dashboard Widget**:
   - Create `AiMarketPulseWidget` component in src/components/widgets/
   - Shows on the Dashboard page in the bento grid
   - Content: 3-4 short AI-generated market insight bullets
   - Data source: GET /api/market-research/trending (already exists)
   - Parse trending data client-side to generate insights like:
     - "Hermès Birkin demand is very high — prices rising 8% this quarter"
     - "Louis Vuitton Pochette Metis is the fastest-moving item under €1,500"
   - Each insight has a trend icon (TrendingUp/TrendingDown/Minus) and the brand name bolded
   - Card header: "AI Market Pulse" with Sparkles icon and a subtle animated pulse dot (green)
   - Add to DashboardView.tsx in an appropriate bento grid slot

Use the existing AnimatedNumber component for any numeric displays. Run typecheck.
```

---

## PROMPT 9: Toast & Loading State Polish

```
Polish all loading states and toast notifications across Luxselle.

1. **Custom toast styling**: In the app's toast configuration (wherever Toaster is rendered):
   - Style to match lux design tokens: bg-white, border border-lux-200, rounded-2xl, shadow-elevated
   - Success: left green border accent (border-l-4 border-emerald-500)
   - Error: left red border accent (border-l-4 border-red-500)
   - Position: top-right
   - Duration: success 3s, error 5s
   - Add subtle slide-in animation from right

2. **Loading states audit**: Go through each page and ensure:
   - MarketResearchView: "Researching..." button state should show an animated progress bar below the button (indeterminate, thin, lux-gold color)
   - All API-loading states should use the Skeleton component with proper sizing
   - The "Ready to research" empty state should have a subtle floating animation on the BarChart3 icon
   - Trending section: skeleton cards (not just a spinner) while loading

3. **AI Thinking Indicator**: Create a small `AiThinkingDots` component:
   - Three dots that animate in sequence (bounce up one at a time, like iMessage typing)
   - Used alongside "Researching..." text in the market research form
   - Colors: lux-400 dots that pulse to lux-900

Run typecheck. Test on mobile and desktop.
```

---

## PROMPT 10: Design Consistency Audit

```
Perform a design consistency audit across the entire Luxselle frontend.

Go through every file in src/pages/ and src/components/ and fix these issues:

1. **Color tokens**: Replace ALL raw Tailwind colors with lux- equivalents:
   - gray-400 → text-lux-400
   - gray-500 → text-lux-500 or text-lux-400
   - gray-600 → text-lux-600
   - gray-700 → text-lux-700
   - gray-800 → text-lux-800
   - gray-900 → text-lux-900
   - gray-100 → bg-lux-100
   - gray-50 → bg-lux-50
   - Any blue/indigo colors → remove or replace with lux-gold or emerald for links
   - Keep emerald/amber/red for status colors (they're intentional)

2. **Typography**: Ensure:
   - All section labels use: text-[12px] font-semibold text-lux-400 uppercase tracking-[0.06em]
   - All form labels use: text-[12px] font-medium text-lux-600 mb-1.5
   - Price displays use font-mono
   - No orphaned font-size values — use the Tailwind scale (text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl)

3. **Spacing**: Ensure:
   - Card padding is consistently p-5 or p-6
   - Section gaps are gap-6
   - Form field gaps are space-y-4

4. **Border radius**: Ensure lux-card uses rounded-[20px], not rounded-xl or rounded-2xl inconsistently

5. **Focus states**: Every clickable element needs focus-visible styles:
   - Buttons: Already have via .lux-btn classes
   - Links and NavLinks: Add focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none
   - Cards that are clickable: Same ring treatment

Run typecheck after all changes. This should be a systematic file-by-file sweep.
```

---

## PROMPT 11: Mobile Responsiveness Pass

```
Do a mobile responsiveness pass on all Luxselle pages.

Test at these breakpoints: 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px (laptop), 1440px (desktop).

Fix these known issues:
1. MarketResearchView: The 2-column grid should stack to 1 column on mobile. The quick-select chips should be horizontally scrollable (overflow-x-auto) on mobile, not wrapping.

2. Market indicators (demand/trend/liquidity 3-column grid): Should become a vertical stack on mobile with horizontal layout on tablet+.

3. DashboardView bento grid: Verify all cards are readable at 375px. StatCards should stack their values vertically on small screens.

4. All touch targets: Ensure minimum 44x44px on mobile. Check nav items, chips, icon buttons, external link buttons.

5. Input fields: Ensure they're full-width on mobile with proper spacing.

6. Comparables table: Should be scrollable horizontally or collapse to a card layout on mobile.

7. MobileNavDrawer: Verify it works with the current route list. Add smooth slide-in animation if missing.

8. Typography: Headings that are text-2xl+ should scale down on mobile (add responsive prefixes).

Apply `@media (max-width: 640px)` or Tailwind sm: prefixes as needed. Run typecheck.
```

---

## Tips for Best Results in Cursor Agent Mode

1. **Use Plan Mode first**: Hit Shift+Tab before running — review the agent's plan, remove unnecessary steps
2. **Commit after each prompt**: `git add -A && git commit -m "polish: <description>"` — gives you safe rollback points
3. **If the agent drifts**: Revert with `git checkout .`, refine the prompt with more specifics, rerun
4. **Check the diff**: Always review `git diff` before committing — agents sometimes make unrelated changes
5. **Test in browser**: Keep `npm run dev` running and check each change visually
6. **One thing at a time**: Don't paste multiple prompts at once — do them sequentially so you can catch issues early

---

## Dependency Checklist

These packages should be installed for all prompts to work:

```bash
npm install framer-motion
```

That's the only new dependency needed. Everything else (lucide-react, react-hot-toast, tailwindcss-animate) is already in the project.
