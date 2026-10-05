---
name: rtk
description: Use RTK to reduce shell output. Read this skill before direct RTK commands, RTK installation checks, or RTK hook diagnosis.
---

# RTK

RTK is a command proxy that reduces shell output. This local reference targets the image-pinned RTK 0.51.0. It is not an upstream runtime skill.

Use ordinary shell commands when the Pi RTK hook is active. The hook selects the RTK command. Do not add a second RTK prefix.

For a direct installation check, run `rtk --version`. For recorded output savings, run `rtk gain`. For unfiltered command output during diagnosis, run `rtk proxy <command>`. Preserve the original command exit status and error output in verification evidence. Reduced output does not prove that a check passed.

Inspect the active extension and its command rules before you change hook behavior. Report an unavailable hook. Do not install software or change global configuration without approval.
