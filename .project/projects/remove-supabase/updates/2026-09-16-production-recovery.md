# Production recovery after merge

PR 16 merged at 05:03:44 UTC. Netlify deployed e2df9f508d0a7824139a4fcc53e6ed98919685f1 with the old production environment. Database and auth variables existed only in deploy-preview. The owner reported the outage; live health confirmed database_not_configured and auth_not_configured. No application code change was needed.

## Repair

- Imported a fresh read-only Supabase snapshot into the empty Railway production destination, separately from rehearsal. Reconciled 2 users, 2 credential accounts, 3 profiles and all 37 application tables. Source data was not modified.
- Verified agent ciphertext/hash preservation, retained encryption-key equality, and Vault plaintext equality in memory.
- Configured production DATABASE_URL, DATABASE_SSL_CA, BETTER_AUTH_SECRET, BETTER_AUTH_URL, STRAP_ENCRYPTION_SECRET, STRAP_VAULT_SECRET and STRAP_MAINTENANCE_SECRET from BWS. Auth/site origin is https://strap.bvdm.ai. Other contexts were verified unchanged.
- Preserved the existing encryption key and old source environment. The new encryption variable contains the retained key, not a rotated key.
- Configured GitHub STRAP_SITE_URL and STRAP_MAINTENANCE_SECRET for the existing retention workflow. No authorized pruning run was triggered during recovery.
- Rebuilt main with cleared cache. Production deployment 6aaa5b6404a1115f9c4953e9 serves e2df9f508d0a7824139a4fcc53e6ed98919685f1 with the repaired environment.

## Verification

- Production API, database and authentication health pass.
- An existing password account signs in, loads its saved profile and signs out successfully; the old session is then rejected.
- An existing legacy bearer key reads the profile.
- An audited API reveal of the existing Vault item matches its decrypted value in memory.
- Home, file shell and both OAuth discovery routes respond successfully.
- Unauthenticated app-state and maintenance requests return 401.

## Remaining boundaries

Sessions were not migrated; users must sign in again. Source OAuth tokens were all expired, so expired clients need reconnection. Fresh OAuth/device/MCP flows passed the hosted rehearsal; production continuation with an old OAuth token is not claimed.

Google/X credentials and real delivered-email checks remain open. Only one existing account was exercised through HTTP authentication. Full T-017 acceptance therefore remains open despite restored service.

The owner pasted live credentials when reporting the outage. Provider-secret rotation is a follow-up. Rotating the retained encryption key requires re-encrypting existing data, rather than simply replacing the variable.

Supabase remains intact. Rollback after new Railway writes requires reconciling target-only data. No pause or decommission operation was performed. No secrets or raw exports are included in this evidence.
