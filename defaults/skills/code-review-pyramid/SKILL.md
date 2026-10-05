---
name: code-review-pyramid
description: Prioritize independent code review by API semantics, implementation semantics, documentation, tests, and code style.
license: CC-BY-SA-4.0
---

# Code Review Pyramid

This local adaptation uses Gunnar Morling's [Code Review Pyramid](https://www.morling.dev/blog/the-code-review-pyramid/), licensed under CC BY-SA 4.0. Read the assigned Reviewer contract before review. Remain read-only.

Inspect the approved requirements, baseline, and actual diff. Spend most review effort on these first two levels:

1. Check API semantics. Verify compatibility, minimal interfaces, configuration behavior, and one clear method for each operation.
2. Check implementation semantics. Verify required behavior, failure handling, concurrency, security, performance, and necessary complexity.
3. Check documentation. Verify that instructions describe the actual behavior and its limits.
4. Check tests. Use independent expected values. Identify an incorrect behavior that each changed test must detect. Require recorded failure and restored-pass evidence.
5. Check code style. Prefer configured automated checks over personal preferences.

Return actionable findings with severity, path, line, requirement, evidence, and correction. Report unavailable checks separately from confirmed defects. State the reviewed scope when you find no defect. The parent owns acceptance.
