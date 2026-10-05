# Make native Paseo roles ready for approved deployment

Labels: wayfinder:map
Status: open

## Destination

Define an operator-approved acceptance, verification, and migration plan for the shipped native-role milestone. The route must preserve isolation, customized configuration, credentials, and persisted state without claiming unverified recovery.

The map ends when no decision blocks a separate deployment plan. This map does not authorize deployment.

## Notes

- The source baseline is [Use native Paseo roles and verified Lens capabilities](https://github.com/syamsudotdev/isolated-paseo/commit/c6cadf34ef6adde17a161815b9dac212fa40a447). Source shipping is complete. The remaining concerns are overall acceptance, migration/deployment, and broader runtime evidence.
- Read [the native-role contract](../../README.md#native-roles-and-official-paseo-skills), [the orchestrator contract](../../defaults/pi/roles/orchestrator.md), and [the specialist contract](../../defaults/pi/roles/specialists.md). Consult `wayfinder`, `grilling`, and `domain-modeling` for decision sessions. Consult `verification-planning` before proposing checks. Consult `ship` only when a later approved change must ship.
- Use the local Markdown tracker. Child issues live in `issues/`. `Status: open` and `Assignee: Unassigned` mean unclaimed. Claim one ticket before work by assigning the driving developer and setting `Status: claimed`. A `Blocked by` entry names local ticket numbers. A ticket becomes available only after every blocker has `Status: resolved`.
- Choose available tickets by filename order. Refer to tickets by their linked titles in prose. Append a resolution under `## Answer`, mark the ticket resolved, and add a one-line pointer under Decisions so far. Do not duplicate the answer in this map.
- Work through one human decision ticket per session. All initial tickets require a live human exchange. Charting resolved none of them.
- Keep Pi 1.0.2, Paseo 0.10.3, FFF 0.11.0, and Lens 4.3.0 pinned. Preserve configured models and thinking settings. Keep official Paseo skills unchanged. Use only `paseo.role`; add no legacy compatibility.
- Preserve one writer per workspace and parent-owned approvals, review, and retry accounting. Paseo remains the only managed-child lifecycle owner. Add no replacement scheduler, role broker, or worker pool.
- The shipping gate passed 49 tests with no failures or skips. Bounded tests establish native launch discovery and synthetic SDK operations for both writers: a fixed TypeScript error, confirmed clean restoration, fixed AST dumping, FFF searches, and tool-denial controls. They do not establish real provider turns, deployed dispatch, other writer operations, or general language-server coverage.
- Preserve evidence limits. The researcher timed out. The worker settlement report failed schema validation. Parent checks and independent r3 review establish the bounded correction, not successful worker settlement or public Lens release provenance. Historical persisted-state recovery remains unproven.
- Keep live migration manual and separately approved. Do not overwrite customized files or delete a live customized `paseo-slim` skill based on repository deletion alone. Preserve authentication, sessions, supervision state, and operator-owned profiles, including Designer, Observer, Council, and project-specific ticket roles.
- Do not publish private logs, configuration values, credential locations, state archives, or host identifiers. Use synthetic data in proposed tests. Each future test or service change needs its own approved scope. No provider-paid execution is authorized by this map.

## Decisions so far

<!-- No decision tickets have been resolved. Source shipping is a baseline, not an unresolved ticket. -->

## Not yet specified

The required detail for live fixtures, recovery proof, and operator handoffs depends on the selected acceptance criteria and verification strategy. Additional decisions can emerge from those choices. Do not assume a provider budget, language set, or acceptable recovery risk before the human decides.

## Out of scope

- Deployment, live configuration changes, credential copying, state restoration, or paid provider requests during charting.
- Version upgrades, model changes, replacement lifecycle frameworks, and legacy agent compatibility.
- A claim that tool allowlists provide an operating-system sandbox; writer `bash` remains broad.
- Reopening completed source shipping as an open implementation ticket. New code ships only after a later decision establishes and approves its scope.
