import { normalizeAgentIdStrict } from 'openclaw/plugin-sdk/routing';
import { schedulingBlockReason } from './rules.ts';

export const PLUGIN_ID = 'webhook-guard';

export interface GuardConfig {
  allowAgents: string[];
}

export interface ToolCallEvent {
  toolName: string;
  params?: unknown;
}

export interface ToolCallContext {
  agentId?: string;
}

export interface BlockResult {
  block: true;
  blockReason: string;
}

/**
 * The host's canonical form of an agent id, or undefined when it has none. The host lowercases agent ids
 * (`normalizeAgentIdStrict`, plugin-sdk/routing, 2026.10.4), so `allowAgents` is compared in that form. The strict
 * variant is used because the lenient one maps an unusable id to the default agent, which would exempt it.
 */
function canonicalAgentId(id: string): string | undefined {
  const result = normalizeAgentIdStrict(id);
  return result.ok ? result.value : undefined;
}

/** Every agent is checked unless its id is in `allowAgents`. Anything else in the config is ignored. */
export function resolveConfig(raw: unknown): GuardConfig {
  const value = typeof raw === 'object' && raw !== null && 'allowAgents' in raw ? raw.allowAgents : undefined;
  return {
    allowAgents: Array.isArray(value)
      ? value.flatMap((id) => (typeof id === 'string' ? (canonicalAgentId(id) ?? []) : []))
      : [],
  };
}

/**
 * Only a known, listed agent is exempt. A call with no agent id is checked: OpenClaw documents missing context fields
 * as unproven, not as "some other agent" (plugins/hooks/tool-policy.md, 2026.10.4).
 */
export function decide(event: ToolCallEvent, ctx: ToolCallContext | undefined, config: GuardConfig): BlockResult | undefined {
  const agentId = ctx?.agentId ? canonicalAgentId(ctx.agentId) : undefined;
  if (agentId && config.allowAgents.includes(agentId)) {
    return undefined;
  }
  const reason = schedulingBlockReason(event.toolName, event.params);
  return reason ? { block: true, blockReason: reason } : undefined;
}

export interface HookApi {
  pluginConfig?: unknown;
  on(
    name: 'before_tool_call',
    handler: (event: ToolCallEvent, ctx?: ToolCallContext) => BlockResult | undefined,
    options: { priority: number },
  ): void;
}

/**
 * Registers one `before_tool_call` handler. `{ block: true }` is terminal, and the host blocks the call when a handler
 * throws or times out (plugins/hooks/reference.md:93, 2026.10.4), so the guard fails closed.
 */
export function register(api: HookApi): void {
  const config = resolveConfig(api.pluginConfig);
  api.on('before_tool_call', (event, ctx) => decide(event, ctx, config), { priority: 100 });
}
