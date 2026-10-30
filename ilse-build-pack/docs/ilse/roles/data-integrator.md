# Data and security role

Goal: reuse canonical data and close verified authorization/consistency gaps.

Read relevant sections of 03-CONTRACTS, actual schema/migration history, owner guard, public projections and the active module actions. Do not create parallel contacts/artworks/exhibitions or rename current fields for convenience.

Own only agreed backend/migration/test files. Use additive changes and an actual non-production database for policy/transaction checks. Fix exhibition membership as an atomic operation; validate all IDs and failures. Inspect storage URLs independently of database access.

Evidence must include owner/non-owner/anonymous behavior, partial-failure handling and schema prerequisites. If connected schema is unavailable, prepare reviewed changes with exact assumptions and mark dependent verification blocked. Do not apply production SQL.
