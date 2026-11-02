# How it works

Checked against OpenClaw 2026.10.4.

## The hook

The plugin registers one `before_tool_call` handler at priority 100 (`plugins/hooks/tool-policy.md`). For a call it blocks, it returns `{ block: true, blockReason }`, which is terminal: lower-priority handlers are skipped and the tool doesn't run. OpenClaw also blocks the call when a `before_tool_call` handler throws or times out (`plugins/hooks/reference.md:93`). Tool Search and Code Mode keep plugin `before_tool_call` hooks for the calls they make on the model's behalf (`tools/tool-search.md:321-323`, `tools/code-mode/internals.md:63-64`).

No conversation-access grant is needed: `before_tool_call` sees only the tool name, its parameters and run metadata.

## What counts as a webhook route

The scheduling tool is `cron`, with the alias `automations`. Its delivery schema has four ways to post to a URL (`createCronDeliverySchema` and `createCronFailureAlertSchema` in the built cron tool):

| Field | Webhook when |
| --- | --- |
| `delivery.mode` | `"webhook"` |
| `delivery.failureDestination.mode` | `"webhook"` |
| `delivery.completionDestination` | present (its only mode is `"webhook"`) |
| `failureAlert.mode` | `"webhook"` |

The schemas allow extra properties, and the tool also accepts job fields at the top level of the call. So instead of checking those four paths, the plugin scans the whole parameter tree and blocks when it finds:
- a `mode` equal to `webhook` (ignoring case and surrounding space);
- a set value (not `null`, `false`, `0` or empty) under any key whose name contains `webhook`;
- a `to` that holds a URL: anything with `://`, or anything `URL.parse` reads as `http:` or `https:`, such as `https:host/path`. The host accepts that form as a webhook URL (`normalizeHttpWebhookUrl`, OpenClaw 2026.10.5).

The tool also accepts flat dotted keys beside the action arguments, such as `'delivery.mode': 'webhook'` or `'job.delivery.to'`, and nests them into the job (`nestDottedCronKey` in the built cron tool, OpenClaw 2026.10.5). For `mode` and `to`, a key counts by its last dotted segment, after trimming it and stripping surrounding quotes, so those keys are caught too.

A URL elsewhere, such as in a reminder's text, isn't a route and passes. Neither is the word `webhook` as a job id or name, or a key such as `webhookEnabled: false`.

## Failing closed

- Parameters that aren't an object are blocked.
- An `action` outside the list the scheduling tool had in 2026.10.4 (`status`, `list`, `get`, `add`, `update`, `remove`, `run`, `runs`, `next_check`, `wake`) is blocked. A new action in a later version stays blocked until the list in `src/rules.ts` is updated.
- A call with no agent id is checked. OpenClaw documents missing context fields as unproven (`plugins/hooks/tool-policy.md`).

## Exemptions

`allowAgents` ids are compared in the host's canonical form, from `normalizeAgentIdStrict` in `openclaw/plugin-sdk/routing`, which lowercases them. So `Ops` in the config matches the agent id `ops`. An id with no canonical form is dropped, not mapped to the default agent.

## What it can't see

- Jobs created outside an agent's tools: the `openclaw cron` CLI, the Control UI and Gateway RPC callers. To catch those as well, check `openclaw cron list --json --all` for webhook routes from outside the gateway.
- Existing jobs. The plugin acts when a job is created or changed, not on jobs already stored.
- Parameters another plugin rewrites. Each `before_tool_call` handler gets a copy of the original event, not earlier handlers' returned `params`, and the tool runs with the merged result without a second check (`plugins/hooks/tool-policy.md`; `runBeforeToolCall` in `dist/hooks-B4X8NX3v.mjs`, OpenClaw 2026.10.5). Trusted tool policies run before ordinary hooks, so they don't see the rewrite either. Don't load a plugin that rewrites `cron` or `automations` parameters alongside this one.
