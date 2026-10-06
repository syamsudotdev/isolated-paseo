# Define overall acceptance criteria for native Paseo roles

Labels: wayfinder:grilling
Type: grilling
Status: resolved
Assignee: Pi parent session (acceptance decision driver)
Mode: HITL
Parent: ../map.md
Blocked by: none

## Question

What requirements and evidence must the shipped native-role milestone satisfy before the operator accepts it for live use?

The shipping decision accepted the reviewed source scope. It did not accept deployed behavior. Metadata r2 and capability r3 have separate reviews. The 49-test shipping gate proves the bounded cases described in [the map](../map.md), not every operational requirement.

Resolve this question with the human. Consult `grilling` and `domain-modeling`. Produce an acceptance matrix that distinguishes required evidence, accepted limits, and deferrable work. Address role settings and skill loading, parent/child ownership, native role metadata, research capability, lifecycle behavior, state preservation, and the limits of writer tool allowlists. Do not assume that every host capability must be duplicated or that every untested capability can be waived.

Keep the existing pins and native-only metadata constraint. Record any proposed scope change as a decision that requires approval, not as permission to implement it.

## Comments

The operator approved this session to claim the ticket and document the acceptance decision. In the live exchange, the operator selected conditional operational acceptance and explicitly approved the acceptance matrix below. Runtime verification remains a separate decision.

## Answer

### Current decision: configuration and system-prompt correctness only

The operator superseded the earlier operational acceptance scope. Verify the parent and six template roles, their native provider/profile mappings, unchanged model and thinking settings, role instruction bindings, compatible skill bindings, tool allowlists, and native-only `paseo.role` policy.

Verify the assembled orchestrator system prompt, not only the source file. Its approval, ownership, retry, recovery, supervision, and acceptance rules must be present. Verify that each child's assembled system prompt includes the shared contract and only its assigned role. The later approved cleanup removed specialist-file retrieval. Prompt inclusion does not prove provider compliance.

Use credential-free, network-disabled disposable launches without provider prompts. Remove attempt-owned containers and temporary files immediately after each attempt, including failure. Preserve shared images, caches, volumes, and existing worktree changes.

Provider behavior, recovery execution, costs, authentication, deployed lifecycle, and live state checks belong to the operator's manual work. They are not acceptance blockers for this narrower configuration check and are not verified by it. Migration and deployment planning remain excluded. Passing these checks establishes configuration correctness only, not live-use readiness.

The operator approved updating these documents and adding the focused offline test in `scripts/roles.test.mjs`. Preserve all version pins, configured models and thinking settings, official skills, native-only metadata, and parent-owned lifecycle policy. Do not deploy, change live configuration, copy credentials, commit, or push.

## Superseded decision history

The following answer records the earlier human decision. It is not the current execution or acceptance contract.

### Acceptance boundary

Use conditional operational acceptance. Define requirements now, but withhold acceptance for live use until required runtime evidence exists. Missing required evidence is an acceptance blocker, not proof of a defect.

Resolving this ticket approves the acceptance contract only. It does not accept deployed behavior or authorize execution, deployment, live configuration changes, credential copying, paid provider prompts, or Git commit/push.

“Required” means that missing evidence blocks acceptance. “Deferred” means that this milestone makes no claim about that capability.

### Approved acceptance matrix

| Area | Required evidence | Accepted limit or deferred work |
| --- | --- | --- |
| Role settings and skills | The parent and six template roles retain their configured settings. Required role instructions and compatible skills load. Official Paseo skills remain unchanged. | Loading a skill does not prove that the role follows it. Designer, Observer, Council, and project-specific roles remain outside the acceptance claim. |
| Parent/child ownership | The parent controls approvals, writer ownership, retry accounting, review, and final acceptance. Children cannot use exposed Paseo management tools. | These controls are instruction policy, not an operating-system sandbox. |
| Native metadata | Actual child records identify the selected role through `paseo.role`. | Legacy metadata compatibility is excluded. |
| Research | The researcher can inspect local sources and accurately report unavailable external research access. | External web research is deferred. The previous timeout does not prove research success. |
| Lifecycle | Actual role dispatch, completion notifications, cancellation, confirmed stopping, and terminal-result reconciliation satisfy the parent-owned policy. | Historical worker settlement remains unproven. Fork, inherited context, and deadline parity are deferred. |
| Provider behavior | Real provider turns establish usable behavior for the six template roles under unchanged settings. | Synthetic calls are insufficient. Any paid execution needs separate approval. |
| State preservation | Evidence supports preservation of existing configuration, authentication, sessions, and supervision state for any later approved operation. | Historical state recovery remains unproven. This session specifies no migration, deployment, or restoration procedure. |
| Writer capabilities | Both writers retain the established TypeScript diagnostic, clean-restoration, AST-dump, FFF, and denial-control evidence. Any additional capability needed for accepted use requires evidence. | Other writer operations and languages remain outside the claim until explicitly required and verified. |

### Evidence and approval limits

The recorded shipping gate passed 49 tests with no failures or skips. Its bounded synthetic evidence remains valid within the limits stated in [the map](../map.md). This session did not rerun those tests or establish additional runtime evidence.

Preserve Pi 1.0.2, Paseo 0.10.3, FFF 0.11.0, and Lens 4.3.0. Preserve configured models and thinking settings, unchanged official skills, native-only `paseo.role`, one writer per workspace, and parent-owned lifecycle policy with Paseo as the only managed-child lifecycle owner.

[Choose the minimum operational runtime verification plan](03-runtime-verification.md) must select evidence methods and execution boundaries in a separate human decision session. This answer selects no test environment, provider budget, additional language set, or execution procedure. Any new implementation or execution scope requires separate approval. Migration and deployment planning remain excluded.

Live-use acceptance remains pending required evidence and the operator's final acceptance.
