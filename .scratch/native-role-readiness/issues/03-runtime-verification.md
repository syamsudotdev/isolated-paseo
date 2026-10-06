# Choose the minimum operational runtime verification plan

Labels: wayfinder:grilling
Type: grilling
Status: resolved
Assignee: Pi parent session (runtime verification decision driver)
Mode: HITL
Parent: ../map.md
Blocked by: 01

## Question

What minimum runtime verification plan can establish the agreed operational requirements without duplicating the evidence already obtained?

Both exact writer profiles passed synthetic SDK checks for a fixed TypeScript error, confirmed clean restoration, AST dumping, FFF searches, activation/declaration changes, and carrier-denial controls. These checks used wrapped native tools and session hooks, not real provider turns. A fixed AST example does not establish general parser correctness. Other writer tools and other languages were not tested by these actual calls.

Use [Define overall acceptance criteria for native Paseo roles](01-acceptance-criteria.md) as the required contract. Resolve this question with the human. Consult `grilling`, `domain-modeling`, and `verification-planning`.

Specify the smallest evidence matrix, test environment, independent expected outcomes, negative controls, owners, time limits, stopping conditions, and approval boundaries. Consider deployed role dispatch and metadata, provider turns, inherited context and skills, deadlines, notifications, cancellation, required research access, remaining writer operations, and required languages. Mark each item required, deferred, or already covered with a stated reason. Do not infer a deadline failure or context failure merely from missing evidence.

Record the cost and credential-handling boundary for any proposed provider-driven test. Do not assume a model budget or copy host credentials. If version-specific facts outside the repository block the decision, create a narrowly scoped research child ticket after identifying the exact question. Do not repeat broad internet research by default.

## Comments

The operator approved this decision session to claim the ticket and document the runtime verification plan. In the live exchange, the operator selected disposable verification first, followed by an existing-runtime gate. The operator required separate provider execution approval and explicitly approved the minimum plan below. This ticket chooses evidence and its approval scope. It does not run live agents, provider-paid prompts, installations, or deployments.

## Answer

### Current decision: focused offline configuration verification

The operator superseded the provider-driven runtime plan with verification of native agents, roles, profiles, and assembled system prompts only. Use the current [acceptance contract](01-acceptance-criteria.md#answer).

Reuse the existing pinned disposable image and native launch probe in `scripts/roles.test.mjs`. Add a configuration-only mode that exits before synthetic writer-tool operations. Launch the parent and six exact template profiles offline without network or credentials. Check provider/profile schemas, fixed role settings, instruction and skill bindings, effective tool allowlists, and assembled prompt content. Check the orchestrator's approval, ownership, retry, recovery, supervision, acceptance, and `paseo.role` rules in the actual assembled prompt. Child system prompts must include the shared contract and only the assigned specialist section. The later approved cleanup removed specialist-file retrieval.

Run the existing official-skill hash, native-profile, and metadata-policy checks with the new focused offline check. Use a representative temporary prompt fault to record a failure, restore it, and record a pass. Do not alter official skills, role policy, models, thinking settings, dependencies, or versions.

Use the existing bounded launch timeouts. Give each attempt a unique container name. Remove the attempt-owned container and temporary files immediately in cleanup on success or failure. Confirm cleanup before another attempt. Do not prune shared images, caches, or volumes. Do not pull or build an image without separate approval.

Stop and report a missing image, failed launch, unconfirmed prompt, incorrect binding, or cleanup failure. No provider generation, writer-tool correctness exercise, recovery implementation, deployed lifecycle check, existing-state inspection, authentication, or provider-budget decision is part of this scope. The operator will handle operational checks manually.

The operator approved the focused test implementation and execution. Record actual results separately; a resolved planning ticket is not a passing test result. No live changes, migration/deployment planning, credential copying, commit, or push are authorized.

### Recorded verification evidence before MCP repair and role inlining

- `node --check scripts/roles.test.mjs` passed.
- `PASEO_ROLE_CONFIGURATION=1 node --test --test-name-pattern='official skills|native profiles|dispatch contract|isolated native configuration' scripts/roles.test.mjs` passed 4 tests with no failures, cancellations, or skips.
- The focused offline check reported verified configuration and assembled prompts for the parent, scout, researcher, worker, reviewer, oracle, and worker-recovery. The parent prompt included the entire orchestrator source and independently specified approval, ownership, retry, recovery, supervision, acceptance, lifecycle-owner, and metadata rules. Child prompts contained their exact role binding, specialist retrieval instruction, no-delegation instruction, and required explicit skill locations. Referenced shared and role sections existed. These observations do not establish provider compliance or actual retrieval of the specialist section.
- Negative evidence: a temporary test-driver fault removed the parent's `--append-system-prompt` binding before launch. The focused test failed with `parent: missing assembled rule: Obtain approval before launching write-capable children or running checks.` Cleanup passed on this failed attempt. The fault was removed; the restored final run passed all 4 selected tests.
- Attempt-owned containers and temporary files were confirmed absent during cleanup on both failure and success. A final filtered Docker inspection found no attempt containers. Shared images, caches, and volumes were not pruned.
- `git diff --check` passed. Session diagnostics reported no issues. Primary LSP diagnostics were unavailable because the diagnostic tool returned `server.extensions is not iterable`; Node syntax validation passed instead. No project formatter or lint task was found.
- No paid prompt, provider generation, live configuration change, deployed lifecycle check, existing-state inspection, or writer-tool correctness exercise ran. The broader runtime suite was not run under this narrowed scope.

## Superseded decision history

The earlier plan and its subsequent qualification remain below as history, not current execution instructions. The worker-recovery execution question is now out of scope rather than proved.

### Decision and environment

Use a disposable environment first. Use synthetic files and preserve the pinned versions, configured models and thinking settings, unchanged official skills, native-only `paseo.role`, one writer per workspace, and parent-owned policy. Paseo remains the only managed-child lifecycle owner.

Existing-runtime evidence remains a separate required gate. A disposable result cannot establish deployed dispatch or preservation of existing state. The exact environments remain unset until separate execution approval. If the existing runtime lacks approved bindings, stop. Do not prepare migration or deployment changes.

### Minimum evidence matrix

| Evidence | Minimum check and independent expected result | Classification |
| --- | --- | --- |
| Existing synthetic checks | Retain the 49-test record and bounded writer evidence. Repeat only if relevant code, inputs, configuration, or environment changes invalidate it. | Already covered within recorded limits. |
| Native launches | Compare the parent and six actual role launches with the approved template. Verify model/thinking settings, instruction binding, compatible skill loading, unchanged official skills, and child `paseo.role` records. | Required in the disposable environment; confirm deployed bindings later. |
| Six provider turns | Give each role one bounded task against synthetic files with fixed expected results. Scout finds a known file. Researcher cites a known local passage and reports missing web access. Oracle evaluates a fixed defect. Reviewer identifies a seeded defect. Each writer applies a separately owned, specified correction. Supply worker-recovery with an oracle-approved recovery approach. | Required. This tests role behavior, not the historical retry sequence. |
| Ownership and tool limits | Record parent approvals, one-writer ownership, review, and reconciliation. Inspect actual child tool exposure. Require a rejected management-tool attempt through a harmless fixture, never a real child-creation operation. | Required. Reuse existing denial controls where their loadout remains valid. No sandbox claim. |
| Lifecycle | Observe dispatch, successful completion notification, and reconciled terminal results. Use one additional bounded run to verify parent-requested cancellation and confirmed stopping. | Required. Unknown status or missing observation blocks the conclusion. |
| Existing runtime and state | After separate approval, confirm the deployed bindings and perform one synthetic dispatch through completion. Compare a private pre/post inventory of pre-existing configuration, authentication, saved sessions, and supervision state. Distinguish authorized new records from changes to pre-existing records. | Required second gate. Disposable results cannot establish this claim. |
| Additional capabilities | Do not add web research, other languages, other writer operations, fork/context parity, or deadline parity to this plan. | Deferred under the acceptance contract. Historical recovery remains unproven. |

The current driver in `scripts/roles.test.mjs` uses synthetic SDK calls, not provider generation. It supplies reusable bounded evidence, not a real-provider harness. No new harness or fixture implementation is authorized here. Fixed fixture contents and independent expected results must be supplied before execution; each negative control must identify the incorrect behavior it detects.

### Owners and evidence records

- The operator owns environment selection, authentication, execution approval, and final acceptance.
- The parent owns task contracts, lifecycle actions, evidence collection, reconciliation, and stopping decisions.
- A read-only reviewer checks the resulting evidence against fixed expected results.
- Each check records initial state, exact actions, expected result, failure condition, and actual observations. Provider statements alone do not prove tool execution or state preservation.
- Keep private inventories private. Publish only sanitized conclusions. Do not publish credential material, complete private logs, configuration values, credential locations, state archives, or host identifiers.

### Time limits and stopping conditions

Use a five-minute observation limit per provider run, a 30-minute limit for each environment's verification session, and 60 seconds to confirm stopping after cancellation. These are operator observation limits, not native deadline guarantees. The session limit also applies when individual runs have not reached their limits.

Stop on the first failed required check, unexpected write, setting mismatch, credential exposure, budget limit, or unknown run state. Do not retry automatically. At a limit, request cancellation through Paseo. If stopping remains unconfirmed, report the blocker and launch no replacement.

### Cost, credentials, and approval boundaries

The provider budget and authentication method remain unset. Before any execution, obtain separate approval of the exact environment identity, scoped operations, monetary ceiling, time limits, and direct authentication method. Do not infer a budget from model settings. Do not copy host credentials.

This plan does not authorize a new harness, installation, provider request, runtime inspection, deployment, live configuration change, credential copying, state restoration, or Git commit/push. Each future test or service change needs its own approved scope. Migration and deployment planning remain excluded.

The simpler path is to retain disposable evidence and stop before the existing-runtime gate. That leaves live-use acceptance blocked.

### Resolution limits

The operator approved this plan and resolution of the map's planning destination. This session established no new runtime evidence. The researcher timeout, worker settlement validation failure, and historical recovery gaps remain as recorded. Resolving this ticket does not resolve those gaps or grant live-use acceptance. Required evidence and final operator acceptance remain pending.

### Subsequent qualification: worker-recovery prerequisite

The approved plan above remains the decision record. Later read-only inspection identified an unresolved prerequisite in its proposed worker-recovery correction. The worker-recovery contract in [the native configuration](../../../defaults/paseo/config.json) requires exhausted normal worker attempts and an oracle diagnosis before recovery implementation. The [orchestrator retry policy](../../../defaults/pi/roles/orchestrator.md#retry-policy) requires recorded attempts and evidence for a materially changed retry approach. An oracle-approved correction alone does not establish these prerequisites.

The plan also requires stopping on the first failed required check and prohibits automatic retries. Do not manufacture an exhaustion record, intentionally repeat failures to reach a counter, or bypass the existing policy to satisfy the six-role requirement.

[Choose policy-compatible worker-recovery verification](04-worker-recovery-verification.md) must resolve this question with the operator. Worker-recovery execution remains blocked until that decision supplies a policy-compatible method. Keep the acceptance requirements and fixed policies unchanged. The map's earlier planning completion is now qualified by this newly identified decision.

After that decision, prepare the concrete execution checklist within this ticket before requesting execution approval. Supply fixed fixture contents and independent expected results, observable evidence for skill loading and lifecycle events, and a private state comparison method with explicitly permitted changes. In the existing-runtime gate, “synthetic dispatch” means actual native dispatch with synthetic task data; an SDK-only call cannot substitute for deployed dispatch evidence.

The approved limits are ceilings, not a guarantee that every check finishes. Six role runs plus one cancellation run at five minutes each would require 7 × 5 = 35 minutes, which exceeds the 30-minute session ceiling. Stop at the session ceiling even when checks remain incomplete. Do not increase limits or divide execution into extra sessions without separate approval.
