# Claude Code Rules

Before changing code:
1. Read CLAUDE.md.
2. Read relevant docs.
3. Inspect current implementation.
4. Identify affected domain entities.
5. Do not invent a parallel architecture.

Never:
- hard-code payment success in frontend
- expose API keys
- hard-code a printer provider into domain logic
- hard-code one global price/country
- make browser lifetime a dependency for generation
- store original child photos as permanent profile assets
- add child voice cloning
- change UI without explicit requirement

Must:
- preserve existing behavior unless intentionally migrated
- use migrations for database changes
- keep integrations behind adapters
- make webhooks idempotent
- handle retries for async jobs
- update docs when architecture changes

For major architectural uncertainty, explain trade-offs instead of silently choosing.
