/** The scheduling tool's canonical id and its alias (OpenClaw 2026.10.4, `openclaw sandbox explain`). */
export const SCHEDULING_TOOLS: ReadonlySet<string> = new Set(['cron', 'automations']);

/**
 * The scheduling tool's actions in OpenClaw 2026.10.4 (`CRON_ACTIONS` in the built cron tool). An action outside this
 * list is blocked, so a new action added by an upgrade can't slip past the webhook check before the list is updated.
 */
export const SCHEDULING_ACTIONS: ReadonlySet<string> = new Set([
  'status',
  'list',
  'get',
  'add',
  'update',
  'remove',
  'run',
  'runs',
  'next_check',
  'wake',
]);

export const WEBHOOK_REASON =
  'Scheduled jobs cannot post to a URL (webhook delivery). Deliver to the chat instead, or ask the owner.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The field a key sets. OpenClaw 2026.10.5 nests a flat dotted key such as `'delivery.mode'` or `'job.delivery.mode'`
 * into the job after trimming it and stripping one pair of surrounding quotes (`nestDottedCronKey` in the built cron
 * tool), so such a key sets its last segment.
 */
function fieldName(key: string): string {
  let k = key.trim();
  if (k.length >= 2 && (k[0] === '"' || k[0] === "'") && k.endsWith(k[0])) {
    k = k.slice(1, -1);
  }
  return k.slice(k.lastIndexOf('.') + 1).trim();
}

/**
 * The host accepts any value `URL.parse` reads as http(s), so `https:host` counts without `//`
 * (`normalizeHttpWebhookUrl` in the built cron tool, 2026.10.5).
 */
function isUrl(value: string): boolean {
  const protocol = URL.parse(value.trim())?.protocol;
  return value.includes('://') || protocol === 'http:' || protocol === 'https:';
}

/**
 * True when a value routes output to a URL. The routes are `delivery.mode`, `failureDestination.mode`,
 * `completionDestination` and `failureAlert.mode` set to "webhook", or a `to` that holds a URL. The whole tree is
 * scanned, so nested and flattened job fields are caught alike, and so are keys added under the same names later.
 * "webhook" counts only as a `mode`, so a job id or name that says webhook is not a route.
 */
export function hasWebhookRoute(value: unknown, key = ''): boolean {
  if (typeof value === 'string') {
    const field = fieldName(key);
    return (field === 'mode' && value.trim().toLowerCase() === 'webhook') || (field === 'to' && isUrl(value));
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasWebhookRoute(item));
  }
  if (isRecord(value)) {
    return Object.entries(value).some(([k, v]) => (/webhook/i.test(k) && Boolean(v)) || hasWebhookRoute(v, k));
  }
  return false;
}

/** A reason to block this tool call, or undefined to let it through. Input it can't read is blocked. */
export function schedulingBlockReason(toolName: string, params: unknown): string | undefined {
  if (!SCHEDULING_TOOLS.has(toolName)) {
    return undefined;
  }
  if (!isRecord(params)) {
    return 'Blocked: the scheduling call has no readable parameters.';
  }
  if (typeof params.action !== 'string' || !SCHEDULING_ACTIONS.has(params.action)) {
    return `Blocked: unknown scheduling action "${String(params.action)}".`;
  }
  return hasWebhookRoute(params) ? WEBHOOK_REASON : undefined;
}
