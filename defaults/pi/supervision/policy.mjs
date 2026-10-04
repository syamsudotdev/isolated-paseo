export const POLL_MS = 10_000;
export const SILENCE_MS = 30_000;
export const REVIEW_MS = 180_000;

// This is observed output silence, not a diagnosis of provider failure.
export function assess(agent, entries, now, complete = true) {
  const turn = agent.activeTurn;
  const started = Date.parse(turn?.startedAt);
  const result = { id: agent.id, turnId: turn?.turnId, status: agent.status,
    role: agent.labels?.['paseo-slim.role'] ?? 'Unknown',
    title: agent.title ?? 'Unknown', agent: agent.provider ?? 'Unknown',
    model: agent.runtimeInfo?.model ?? agent.model ?? 'Unknown',
    startedAt: started, lastOutputAt: null, tools: [], suspectedStall: false,
    observation: 'Unknown', recent: [] };
  if (!turn?.turnId || !Number.isFinite(started) || started > now || !complete) return result;
  const tools = new Map();
  for (const row of entries) {
    if (row.turnId !== turn.turnId) continue;
    const at = Date.parse(row.timestamp);
    if (!Number.isFinite(at) || at < started || at > now) return result;
    const item = row.item;
    if (!item) return result;
    if ((item.type === 'assistant_message' || item.type === 'reasoning') && item.text?.length) {
      result.lastOutputAt = Math.max(result.lastOutputAt ?? started, at);
    }
    if (item.type === 'tool_call') tools.set(item.callId, item.status);
    result.recent.push({ type: item.type, at, text: String(item.text ?? item.name ?? '').slice(-600) });
  }
  result.tools = [...tools].filter(([, status]) => status === 'running').map(([id]) => id);
  result.recent = result.recent.slice(-6);
  result.observation = 'healthy';
  result.silenceMs = now - (result.lastOutputAt ?? started);
  result.suspectedStall = agent.status === 'running' &&
    Array.isArray(agent.pendingPermissions) && agent.pendingPermissions.length === 0 &&
    result.tools.length === 0 && result.silenceMs >= SILENCE_MS;
  return result;
}

export function advisoryDue(state, now, previous) {
  if (state.status !== 'running' || state.observation !== 'healthy') return null;
  const identity = `${state.id}:${state.turnId}`;
  const anchor = state.lastOutputAt ?? state.startedAt;
  if (state.suspectedStall && previous?.stallAnchor !== anchor) {
    return { identity, reason: 'suspected-stall', stallAnchor: anchor };
  }
  if (now - (previous?.reviewAt ?? state.startedAt) >= REVIEW_MS) {
    return { identity, reason: 'direction-review' };
  }
  return null;
}
