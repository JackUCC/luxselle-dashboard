# Shared

Zod schemas and shared types used by the **server** and the **frontend** so both sides validate and type the same data.

## Contents

- **schemas/** — Product, supplier, sourcing request, evaluation, buying list item, system job, transaction, settings, activity event, etc. All exported from `@luxselle/shared` or `@shared/schemas` in the app.

Used via workspace dependency `@luxselle/shared` and path alias `@shared` in the frontend.
