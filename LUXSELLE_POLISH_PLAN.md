# Luxselle Dashboard — Final Polish & AI Feature Plan

## Overview
This document is a structured improvement plan for the final stage of the Luxselle supplier engine. It covers three areas: **UX polish** (navbar, animations, inputs, buttons), a **saved research feature** (star/delete past market research), and **AI feature enhancements** to showcase the supplier engine.

---

## Phase 1: Navigation & Layout Polish

### 1.1 DockBar Improvements
**Current state:** Fixed left sidebar with icon nav, tooltip on hover, active dot indicator. Glassmorphism bg. Works on xl+ only.

**Issues to address:**
- No animated route transitions — page content pops in without entrance
- Active indicator dot is tiny (4px) and can be missed
- No hover micro-interaction beyond scale(1.1)
- Logo has no entrance animation
- No keyboard nav indicator (focus-visible ring missing on nav items)

**Improvements:**
- Add a sliding pill background behind the active icon (animated with `transition: top` or Framer Motion `layoutId`) instead of just a dot
- Logo: subtle breathe animation on idle, scale-up on hover
- Add focus-visible ring (`ring-2 ring-lux-gold/30 ring-offset-2`) to all NavLinks
- Add entrance stagger animation — icons slide in from left on first mount
- Consider adding a collapsed/expanded state toggle for wider screens

### 1.2 Mobile Navigation
- MobileNavDrawer should have backdrop blur + slide-in animation
- Haptic-feeling active states (scale + color transition)
- Bottom sheet pattern on mobile instead of side drawer (modern UX)

### 1.3 Page Transitions
- Wrap route outlet in `AnimatePresence` (Framer Motion) or CSS `@view-transition`
- Fade + slight slide-up for page content on route change
- Skeleton states should animate out smoothly, not pop

---

## Phase 2: Input Fields & Button Polish

### 2.1 Input Fields (`.lux-input`)
**Current state:** 40px height, 14px radius, gold focus ring, #F5F5F7 bg.

**Improvements:**
- **Floating labels**: Animate label from placeholder position to top-left on focus/fill
- **Input icons**: Add left-side icons to key inputs (Search → magnifying glass, Price → euro sign properly aligned)
- **Validation states**: Animate border color change (green check on valid, red shake on error)
- **Auto-resize textareas**: Grow height as user types
- **Select dropdowns**: Replace native `<select>` with a custom dropdown (Radix Select or Headless UI Listbox) — native selects break the luxury aesthetic

### 2.2 PredictiveInput Enhancements
- Add shimmer loading state while suggestions load
- Highlight matching text in dropdown (bold the matched portion)
- Add "AI suggested" badge for AI-powered suggestions
- Smooth dropdown open/close with height animation

### 2.3 Buttons
**Current state:** Primary (dark bg), Secondary (bordered), Ghost (transparent), Pill (compact).

**Improvements:**
- **Loading state**: All buttons should support `isLoading` prop with spinner + disabled
- **Ripple effect**: Subtle radial gradient ripple on click (like Material, but restrained)
- **Icon animations**: Icons inside buttons should animate on hover (arrow slides right, sparkle rotates)
- **Success/error flash**: After async action completes, button briefly flashes green/red
- **Size variants**: Add explicit `sm`, `md`, `lg` size props for consistency
- **Button groups**: Add a ButtonGroup component for related actions (e.g., Star | Delete)

---

## Phase 3: Animation & Micro-interaction Polish

### 3.1 Card Animations
- **Bento grid**: Current stagger delay is CSS variable based — enhance with intersection observer so cards animate in as they scroll into view
- **Card hover**: Add subtle translateY(-2px) lift on hover (not just shadow change)
- **Card press**: Scale(0.98) on mousedown for tactile feedback

### 3.2 Number & Data Animations
- AnimatedNumber already exists — ensure it's used everywhere (dashboard KPIs, price intelligence)
- Add count-up animation for price values when market research results load
- Progress bars should animate from 0 to target width on mount

### 3.3 Loading States
- Replace generic Loader2 spinners with branded skeleton screens
- Pulse animation on skeleton cards (already exists, ensure consistent use)
- Add "AI thinking" animation for market research: animated dots or typing indicator

### 3.4 Toast Notifications
- Currently using react-hot-toast — customize styling to match lux design tokens
- Add slide-in from top-right with backdrop blur
- Success toasts: checkmark icon + green accent
- Error toasts: warning icon + red accent + "Retry" action button

---

## Phase 4: Saved Research Feature (NEW)

### 4.1 Data Model
```typescript
// packages/shared/src/schemas/savedResearch.ts
import { z } from 'zod'

export const SavedResearchSchema = z.object({
  id: z.string(),
  userId: z.string(),
  brand: z.string(),
  model: z.string(),
  category: z.string(),
  condition: z.string(),
  result: MarketResearchResultSchema, // the full result object
  starred: z.boolean().default(false),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
```

### 4.2 Backend Routes
```
POST   /api/saved-research          — Save a research result
GET    /api/saved-research          — List all saved (supports ?starred=true filter)
GET    /api/saved-research/:id      — Get single saved research
PATCH  /api/saved-research/:id      — Update (star/unstar, edit notes)
DELETE /api/saved-research/:id      — Soft delete
```

### 4.3 Frontend: Saved Research Page
- New route: `/saved-research` added to navigation under "check" section
- Page layout:
  - Filter bar: All | Starred | By Brand dropdown
  - Card grid showing saved research items
  - Each card shows: brand, model, recommendation badge, market value, date saved, star toggle
  - Click card → expands to full research result view
  - Delete button with confirmation modal
  - Search/filter by brand or model

### 4.4 Save Action on Market Research Page
- After research completes, show a "Save Research" button (Bookmark icon)
- Toast confirmation: "Research saved — View saved research"
- Quick-star from the results panel (star icon in top-right of recommendation banner)

### 4.5 UI Components Needed
- `SavedResearchCard` — compact card with star toggle, delete, brand/model/date
- `SavedResearchList` — filtered/sorted list with empty state
- `SavedResearchDetail` — full expanded view (reuses MarketResearch result rendering)
- `StarButton` — animated star toggle (filled/outline, with scale bounce)

---

## Phase 5: AI Feature Enhancements

### 5.1 AI-Powered Search Summary
- When market research completes, show a 2-3 sentence AI-generated executive summary at the top
- "Key takeaway: This Chanel Classic Flap in excellent condition is priced 12% below market — strong buy opportunity."
- Animate the text appearing word-by-word (typewriter effect)

### 5.2 AI Confidence Visualization
- Replace the plain percentage with an animated radial gauge
- Color transitions: red (< 50%) → amber (50-75%) → green (> 75%)
- Tooltip explaining what confidence means

### 5.3 Smart Recommendations Widget
- After research, show "AI also suggests checking:" with 2-3 related items
- Based on brand/model similarity and current market conditions
- Each suggestion is a clickable chip that triggers quick research

### 5.4 AI Market Trend Insights
- On dashboard, add "AI Market Pulse" widget
- Shows 3-5 bullet points about current luxury market trends
- Refreshes daily, with subtle pulse animation when new data arrives

### 5.5 AI-Powered Price Alert Suggestion
- After saving research, AI suggests: "Set an alert if this drops below €X?"
- Shows the suggested threshold price with reasoning

---

## Phase 6: Final Design Consistency Audit

### 6.1 Typography Audit
- Ensure all headings use `font-display` (Ibarra Real Nova)
- Body text consistently uses Inter
- Monospace (JetBrains Mono) only for numbers/prices
- Standardize font sizes across all pages (currently some ad-hoc px values)

### 6.2 Color Consistency
- Audit all pages for raw Tailwind colors (gray-400, gray-500) → replace with lux- tokens
- Status colors should always use emerald/amber/rose from design tokens
- Remove any blue/indigo colors that don't belong in the warm palette

### 6.3 Spacing Consistency
- Audit padding/margins against the 4px spacing scale
- Cards should consistently use p-5 or p-6 (not mixed)
- Section gaps should consistently use gap-6

### 6.4 Responsive Audit
- Test all pages at 375px, 768px, 1024px, 1440px breakpoints
- Fix any overflow issues
- Ensure touch targets are 44px minimum on mobile
