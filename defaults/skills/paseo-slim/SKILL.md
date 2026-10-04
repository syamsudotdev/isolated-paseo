---
name: paseo-slim
description: Manage OMO-Slim-style Paseo specialists plus an independent Reviewer. Use for role-based delegation, implementation followed by review, retained Oracle or Reviewer follow-ups, and Council synthesis.
---

# Paseo Slim

Use Paseo-managed children, not a second child lifecycle manager. Read `/home/node/.pi/agent/roles/orchestrator.md` when acting as the parent. Read `/home/node/.agents/skills/paseo/SKILL.md` for current Paseo operation semantics.

## Select a role

Read `/home/node/.pi/agent/roles/specialists.md`. Select Explorer for local discovery; Librarian for external research; Oracle for technical judgment; Designer for interface work; Fixer for bounded implementation; Observer for explicitly requested visual analysis; Council for supplied-response synthesis; Reviewer for independent acceptance evidence.

Launch only the specialists the task needs. Keep this session as the Orchestrator. Avoid an idle worker pool.

## Select configured settings

Inspect configured profiles and their notes through `list_profiles` when available. Select a matching profile without changing its model or thinking settings. If that tool is unavailable, inspect the daemon's configuration read-only and report the limitation. Use provider discovery when no profile fits or no profiles are configured. Report the fallback.

Do not copy OMO-Slim model assignments. Keep configured settings authoritative. Obtain separate user approval for overrides. For Observer, verify visual capability before launch. For Council, supply adviser responses through the parent; use existing Paseo committee operations only when their configured settings and scope fit. Report absent model diversity.

## Dispatch contract

Each prompt must include:

```text
Role: <role name>
Role instructions: /home/node/.pi/agent/roles/specialists.md, section <Role>
Objective: <one bounded outcome>
Approval: <read-only inspection, or the exact approved changes and checks>
Scope: <paths or research sources>
Ownership: <files this child may edit, or none>
Dependencies and context: <completed prerequisites and relevant evidence>
Verification: <assigned checks, or none>
Result: <outcome, references, evidence, changes, checks, unknowns, blockers>
Lifecycle: Perform only this task. Do not delegate. Return decisions to the parent.
```

For Council, replace the role-instruction path with the full shared contract and Council section from `specialists.md`, the Council exception from `orchestrator.md`, and applicable project constraints. Supply the original question and named adviser responses in the same prompt. State that Council uses these supplied instructions without tools, file retrieval, or delegation. Council does not follow file-reading steps in this skill.

Use a descriptive title and labels `paseo-slim.role=<lowercase role>` and `paseo-slim.suite=omo-slim`. Keep the parent ownership label set by Paseo. Keep completion notifications enabled. Record the returned child ID.

With the CLI, discover current flags using `paseo run --help`. A configured Pi-default launch has this form:

```bash
paseo run --provider pi --background --title "Explorer — <objective>" --label paseo-slim.role=explorer --label paseo-slim.suite=omo-slim "<complete task contract>"
```

This example is not permission to override a configured profile. Use explicit workspace placement for isolated worktrees. Placement does not detach the child from this parent.

## Follow-up and reconciliation

For a focused follow-up, inspect the retained child's role, objective, ownership, state, and configured settings. Resume a compatible Oracle or Reviewer by agent ID. State the changed evidence and focused question. Refresh role instructions when they have changed. Never send replacement work to a still-running child without an explicit steering or cancellation decision.

Use a fresh child for unrelated work. Reconcile terminal results against the original task. Give Reviewer the requirements, baseline, changed paths, and test evidence after implementation. Route its corrective findings to the original file owner. Keep full final verification at the parent acceptance step.

Use the installed supervision monitor for fixed checks. Its advice does not authorize changes or establish a stall. The parent verifies current run identity and decides whether to steer or cancel.

## Completion

Finish only when every required child result is terminal and reconciled, review findings are resolved or reported, and applicable final checks pass. Preserve useful Oracle and Reviewer sessions for related follow-ups. Archive disposable verification agents. Report the child roles used and material remaining limitations.
