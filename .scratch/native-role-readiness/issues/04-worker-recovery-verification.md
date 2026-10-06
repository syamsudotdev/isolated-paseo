# Choose policy-compatible worker-recovery verification

Labels: wayfinder:grilling
Type: grilling
Status: resolved
Resolution: out of scope
Assignee: Unassigned
Mode: HITL
Parent: ../map.md
Blocked by: 01, 03

## Scope disposition

The operator removed recovery execution from the agent's scope and will handle it manually. The agent must verify that recovery rules exist and appear in the orchestrator's assembled system prompt, not exercise recovery behavior. This ticket is closed as out of scope, not resolved by runtime evidence. Its question remains below as historical context. Do not execute it or treat it as an acceptance blocker under the narrowed configuration-only contract.

## Historical question

How can the required worker-recovery provider evidence be established without fabricated attempt history, policy changes, or prohibited retries?

[Define overall acceptance criteria for native Paseo roles](01-acceptance-criteria.md#answer) requires real provider behavior for all six template roles. [Choose the minimum operational runtime verification plan](03-runtime-verification.md#answer) proposes a correction by each writer, supplies worker-recovery with an oracle-approved approach, and stops on the first failed required check without automatic retries.

The worker-recovery contract in [the native configuration](../../../defaults/paseo/config.json) permits recovery implementation only after normal worker attempts are exhausted and oracle supplies a diagnosis. The [orchestrator retry policy](../../../defaults/pi/roles/orchestrator.md#retry-policy) requires recorded attempts, evidence, and a materially changed retry approach. The proposed correction does not establish exhaustion. This is a verification-plan prerequisite, not evidence of a runtime defect.

Resolve this question through a live human exchange. Consult `grilling`, `domain-modeling`, and `verification-planning`. Determine whether a bounded verification task can establish the required provider behavior without invoking recovery implementation, or whether execution must remain blocked until a genuine qualifying recovery case exists. Do not assume that either path is sufficient. Check the selected path against the required observable behavior and the unchanged role contract.

Record the exact permitted task, prerequisites, independent expected result, evidence limits, and execution approval boundary. Preserve the acceptance requirements, retry and stopping policies, versions, models, thinking settings, official skills, native-only `paseo.role`, one-writer ownership, and Paseo lifecycle ownership. Do not fabricate attempts or intentionally repeat failures to reach a counter. If no compatible path establishes the requirement, report the remaining blocker rather than weaken the requirement silently.

## Comments

This ticket was created as an open human decision. The operator subsequently approved removing it from scope. No recovery execution occurred and no verification method was selected.

The approved runtime answer remains the historical decision record with a subsequent qualification. This ticket resolves one newly exposed prerequisite. It does not authorize provider prompts, fixture implementation, runtime inspection, installations, migration or deployment planning, live changes, credential copying, or Git commit/push.
