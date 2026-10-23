# PunchX Master Design System

This is the project-specific design system applied using the UI UX Pro Max design workflow as a reference. It is a frontend styling guide, not a runtime dependency.

## Product direction

PunchX is an Indian local-services marketplace. The interface should feel reliable, welcoming and premium without looking like a bank or a generic SaaS dashboard. Keep service discovery fast, booking details clear, and trust signals visible.

## Visual identity

- **Primary palette:** charcoal, champagne gold, warm white and olive.
- **Charcoal / ink:** `#191915` for strong contrast and dark branded surfaces.
- **Champagne gold:** `#B99A62` for primary actions and highlighted details.
- **Light gold:** `#D9C28F` for subtle highlights and dark-surface accents.
- **Gold shadow / depth:** `#80663A` for action gradients and hover depth.
- **Olive:** `#64745D` for trust and success states.
- **Warm paper:** `#FBFAF7` for the app canvas.
- **Warm surface:** `#F7EFE7` for selection cards and muted surfaces.
- **Border:** `#E6DECC` for low-contrast structural separation.

Blue and violet are legacy colors. The shared design layer remaps their common utility classes and high-visibility states to the new palette.

## Typography and layout

Use Inter for interface text and the existing Montserrat brand styling only where the PunchX wordmark needs emphasis. Prefer readable line-height, compact labels, clear hierarchy, generous card spacing, and predictable content widths. Avoid fixed-width layouts that cause horizontal overflow on mobile.

## Interaction and motion

- Use short transitions for buttons and cards (roughly 180–360 ms).
- Use restrained upward reveal for sections; don't animate every text element independently.
- Use a small lift and soft shadow for hover feedback, plus a clear press state for touch interactions.
- Keep decorative glows low contrast and avoid flashing, aggressive movement, or motion that blocks a task.
- Respect `prefers-reduced-motion` so users who disable motion receive a stable interface.
- Preserve large enough touch targets, keyboard focus rings and readable contrast.

## Apply consistently

The shared override layer is `src/punchx-pro-max.css`, imported after existing style layers from `src/main.tsx`. Keep shared tokens there rather than introducing new unrelated accent colors. Authentication, workspace selection, service discovery, professional dashboards, booking, payment and tracking should use the same brand accents while retaining semantic red for destructive/errors and olive/green for success.
