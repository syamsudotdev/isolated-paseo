#!/usr/bin/env bash
set -euo pipefail
source_dir=${DEFAULTS_DIR:-/opt/toolchain/defaults}
agent_dir=${PI_AGENT_DIR:-/home/node/.pi/agent}
skills_dir=${SKILLS_DIR:-/home/node/.agents/skills}
gradle_dir=${GRADLE_DIR:-/home/node/.gradle}
mkdir -p "$agent_dir/roles" "$agent_dir/extensions" "$agent_dir/supervision" "$skills_dir" "$gradle_dir/init.d"
for file in AGENTS.md settings.json; do
	if [[ ! -e "$agent_dir/$file" && ! -L "$agent_dir/$file" ]]; then cp "$source_dir/pi/$file" "$agent_dir/$file"; fi
done
for dir in roles extensions supervision; do
	while IFS= read -r -d '' file; do
		target="$agent_dir/$dir/${file##*/}"
		if [[ ! -e "$target" && ! -L "$target" ]]; then cp "$file" "$target"; fi
	done < <(find "$source_dir/pi/$dir" -maxdepth 1 -type f -print0)
done
for file in gradle.properties init.d/test-forks.gradle; do
	target=$gradle_dir/$file
	if [[ ! -e "$target" && ! -L "$target" ]]; then cp "$source_dir/$file" "$target"; fi
done
# Copy reviewed skill text only. Do not overwrite existing skill files.
while IFS= read -r -d '' file; do
	relative=${file#"$source_dir/skills/"}
	target="$skills_dir/$relative"
	mkdir -p "$(dirname "$target")"
	if [[ ! -e "$target" && ! -L "$target" ]]; then cp "$file" "$target"; fi
done < <(find "$source_dir/skills" -type f -print0)
node "$(dirname "${BASH_SOURCE[0]}")/merge-mcp.mjs" "$source_dir/pi/mcp.json" "$agent_dir/mcp.json"
