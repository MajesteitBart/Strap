# Authorization policy matrix

The local source mirror contains 45 active public policies across 37 tables and matches the repository's 61 migration versions. The initial research totals (76 policies, 71 migrations) were not reproducible; this matrix uses the verified catalog. The new baseline has no RLS, auth.uid(), definer helpers or public database HTTP endpoint.

Every row below has an independently enumerated negative case in tests/db/policy-matrix.test.ts. The test executes the real SQL predicate in Postgres against a foreign user's row, with actual membership fixtures. tests/db/authorization.test.ts exercises persisted rows, successful access, role differences, hidden/deleted sections, NEW-row guards, revocation and conflict-upsert theft. The policy inventory is fixed input, not generated from the replacement guards.

| ID | Source policy | Table | Operation | Replacement / negative test |
| --- | --- | --- | --- | --- |
| P-001 | Read own entitlement | creed_entitlements | select | rowScope + authorizeValues where applicable; P-001 |
| P-002 | Users insert own getting started | creed_getting_started | insert | rowScope + authorizeValues where applicable; P-002 |
| P-003 | Users read own getting started | creed_getting_started | select | rowScope + authorizeValues where applicable; P-003 |
| P-004 | Users update own getting started | creed_getting_started | update | rowScope + authorizeValues where applicable; P-004 |
| P-005 | creed_audit_log_select_own | creed_audit_log | select | rowScope + authorizeValues where applicable; P-005 |
| P-006 | deny client access to company github integration | creed_company_github_integration | all | rowScope + authorizeValues where applicable; P-006 |
| P-007 | deny client access to oauth authorization codes | oauth_authorization_codes | all | rowScope + authorizeValues where applicable; P-007 |
| P-008 | deny client access to oauth clients | oauth_clients | all | rowScope + authorizeValues where applicable; P-008 |
| P-009 | deny client access to seat purchases | creed_seat_purchases | all | rowScope + authorizeValues where applicable; P-009 |
| P-010 | deny client writes to company version control | creed_company_version_control | all | rowScope + authorizeValues where applicable; P-010 |
| P-011 | members read connections | creed_connections | select | rowScope + authorizeValues where applicable; P-011 |
| P-012 | members read credit transactions | creed_credit_transactions | select | rowScope + authorizeValues where applicable; P-012 |
| P-013 | members read credits | creed_credits | select | rowScope + authorizeValues where applicable; P-013 |
| P-014 | members read mcp clients | creed_mcp_clients | select | rowScope + authorizeValues where applicable; P-014 |
| P-015 | members read mcp read events | creed_mcp_read_events | select | rowScope + authorizeValues where applicable; P-015 |
| P-016 | members read own agent permissions | creed_member_agent_permissions | select | rowScope + authorizeValues where applicable; P-016 |
| P-017 | members read quality reports | creed_quality_reports | select | rowScope + authorizeValues where applicable; P-017 |
| P-018 | members read their creed roster | creed_members | select | rowScope + authorizeValues where applicable; P-018 |
| P-019 | members read their creeds | creeds | select | rowScope + authorizeValues where applicable; P-019 |
| P-020 | members read visible activity | creed_activity | select | rowScope + authorizeValues where applicable; P-020 |
| P-021 | members read visible proposals | creed_proposals | select | rowScope + authorizeValues where applicable; P-021 |
| P-022 | members read visible section versions | creed_section_versions | select | rowScope + authorizeValues where applicable; P-022 |
| P-023 | members read visible sections | creed_sections | select | rowScope + authorizeValues where applicable; P-023 |
| P-024 | oauth_tokens_delete_own | oauth_tokens | delete | rowScope + authorizeValues where applicable; P-024 |
| P-025 | oauth_tokens_select_own | oauth_tokens | select | rowScope + authorizeValues where applicable; P-025 |
| P-026 | owner reads company ai settings | creed_company_ai_settings | select | rowScope + authorizeValues where applicable; P-026 |
| P-027 | owner reads company billing | creed_company_billing | select | rowScope + authorizeValues where applicable; P-027 |
| P-028 | owners and admins read invites | creed_invites | select | rowScope + authorizeValues where applicable; P-028 |
| P-029 | personal owner deletes activity | creed_activity | delete | rowScope + authorizeValues where applicable; P-029 |
| P-030 | personal owner deletes proposals | creed_proposals | delete | rowScope + authorizeValues where applicable; P-030 |
| P-031 | personal owner deletes sections | creed_sections | delete | rowScope + authorizeValues where applicable; P-031 |
| P-032 | personal owner inserts activity | creed_activity | insert | rowScope + authorizeValues where applicable; P-032 |
| P-033 | personal owner inserts proposals | creed_proposals | insert | rowScope + authorizeValues where applicable; P-033 |
| P-034 | personal owner inserts sections | creed_sections | insert | rowScope + authorizeValues where applicable; P-034 |
| P-035 | personal owner updates activity | creed_activity | update | rowScope + authorizeValues where applicable; P-035 |
| P-036 | personal owner updates proposals | creed_proposals | update | rowScope + authorizeValues where applicable; P-036 |
| P-037 | personal owner updates sections | creed_sections | update | rowScope + authorizeValues where applicable; P-037 |
| P-038 | read member section permissions | creed_member_section_permissions | select | rowScope + authorizeValues where applicable; P-038 |
| P-039 | users and managers can read creed ai usage | creed_ai_usage | select | rowScope + authorizeValues where applicable; P-039 |
| P-040 | users can insert their creed ai usage | creed_ai_usage | insert | rowScope + authorizeValues where applicable; P-040 |
| P-041 | users can manage their creed ai settings | creed_ai_settings | all | rowScope + authorizeValues where applicable; P-041 |
| P-042 | users can manage their creed integrations | creed_integrations | all | rowScope + authorizeValues where applicable; P-042 |
| P-043 | users can manage their creed tokens | creed_tokens | all | rowScope + authorizeValues where applicable; P-043 |
| P-044 | users can manage their creed version control | creed_version_control | all | rowScope + authorizeValues where applicable; P-044 |
| P-045 | users read own token grants | oauth_token_creeds | select | rowScope + authorizeValues where applicable; P-045 |

## Service boundaries

Session reads and personal writes use a viewer DatabaseContext and lib/authz/policies.ts. Unknown table/action pairs and anonymous actors deny by default. Every insert/update checks NEW values; upserts also apply setWhere to the conflicting row. lib/strap-permissions.ts remains the shared section/agent permission lattice; the SQL read predicates enforce its visibility rules before rows leave the database.

Privileged server operations must name their purpose through lib/db/service.ts. They retain domain checks: current membership and role for Company changes; verified hash, explicit profile grant and credential mode for agent/OAuth/MCP access; authenticated self for personal token provisioning; an invitation token plus matching email for invitation acceptance. Retained database functions validate atomic ownership/device/skill operations. There is no browser database client.

Vault and avatar repositories accept a viewer directly and apply their own SQL scopes. Vault reveal requires a successful audit and rechecks membership before decrypting; metadata responses never include ciphertext. User-directory reads expose only account display metadata and require self or shared membership. Maintenance requires its dedicated bearer secret.

## Review findings

- The old Company loader used a service client. It now uses viewer scope and re-reads current membership, so a stale passed role cannot expose hidden sections after revocation.
- Foreign primary-key collisions in proposal/activity upserts require an existing-row scope as well as NEW-row validation. Both are now enforced and tested.
- The onboarding-status app route now uses requireApiAuth like the rest of /api/app.
- No independent second-model review has been performed. The user explicitly prohibits subagents; this remains the T-021 release review gate, not a claim of completed review.
