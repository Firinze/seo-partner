# Contributing to `seo-partner`

Thank you for contributing to `seo-partner`!

## Adding a Framework Adapter (`packages/adapters`)

1. Implement the `FrameworkAdapter` interface in `packages/adapters/src/`.
2. Ensure zero code execution (`F-S5`) and line-accurate extraction (`line >= 1`).
3. Add a realistic fixture project under `tests/fixtures/` and conformance tests in `tests/unit/`.

## Adding an SEO Rule (`packages/rules`)

1. Every rule MUST cite an official Google Search Central / Schema.org URL (`officialSourceUrl`). Unconfirmed claims must never be turned into hard rules.
2. Every finding MUST include exact `filePath` and `lineNumber >= 1` evidence.
3. Include unit tests proving zero false positives on compliant routes.

