# Security Policy (`SECURITY.md`)

## Local-First & Privacy Guarantees

1. **Zero Code Execution (`F-S5`)**: `seo-partner` never executes any code from the scanned repository. All extraction uses static AST and text parsing.
2. **Secret Exclusion (`SC-005`)**: `.env*` files (except `.env.example`), private keys (`*.pem`, `*.key`, `id_rsa`), and `.gitignore` paths are excluded before indexing.
3. **Automatic `.gitignore` Hardening**: `seo-partner init` automatically ensures `.agents/`, `.seo/index.db*`, and `.seo/logs/` are excluded from version control.
4. **Strict Offline Mode (`--offline`)**: Passing `--offline` blocks all outbound network requests and logs any blocked attempt in `.seo/logs/outbound.jsonl`.

## Reporting a Vulnerability

Please report security issues privately to the maintainer (Firinze Gbènito Dossou / Leadbooster) before public disclosure. We acknowledge reports within 48 hours.

