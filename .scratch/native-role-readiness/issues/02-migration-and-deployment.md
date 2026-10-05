# Choose a safe native-role migration and deployment plan

Labels: wayfinder:grilling
Type: grilling
Status: open
Assignee: Unassigned
Mode: HITL
Parent: ../map.md
Blocked by: 01, 03

## Question

What migration, deployment, and recovery plan can satisfy the agreed acceptance criteria while preserving operator-owned configuration and persisted state?

The native configuration is a template, not an automatically installed configuration. Initialization remains missing-only. Repository deletion of `paseo-slim` does not authorize deletion of a live customized skill. Existing providers, profiles, authentication, sessions, supervision state, and project-specific roles must remain operator-owned.

Resolve this question with the human. Consult `grilling`, `domain-modeling`, and `verification-planning`. Select the target environment and migration method. Define the exact approved files, prerequisite evidence, backup validation, ordered actions, stopping conditions, observable success conditions, recovery evidence, and final operator approval. Distinguish a proposed rollback procedure from verified persisted-state recovery.

Use the decisions from [Define overall acceptance criteria for native Paseo roles](01-acceptance-criteria.md) and [Choose the minimum operational runtime verification plan](03-runtime-verification.md). Do not inspect or publish private state to answer this planning ticket without a separate data-handling approval.

## Comments

This ticket selects a plan. It does not authorize configuration replacement, deployment, deletion of customized files, or restoration of state.
