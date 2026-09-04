---
name: Preview-safe legacy styles
description: How to load the storefront’s public legacy styles without causing Replit preview hydration failures.
---

Do not server-render the storefront’s legacy stylesheet links as explicit children of the root layout head. Load those public styles client-side without adding server head children.

**Why:** Replit inserts its preview tooling script into the document head. React then compared that script against the first manually rendered stylesheet link and raised a hydration mismatch. Hydration suppression did not prevent the runtime error, while bundling the legacy CSS failed because it references optional public assets.

**How to apply:** Keep the root head structurally empty and use the existing client-safe stylesheet loader. If legacy styles move, update that loader rather than importing the public CSS into Turbopack.