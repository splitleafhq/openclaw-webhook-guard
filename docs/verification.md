# Verification

## Checked

- **Unit tests** (`npm test`) cover every webhook route, the alias, chat delivery and reads passing, unreadable parameters, unknown actions, exemptions and calls with no agent id, and the leak scan.
- **Typecheck** against the OpenClaw 2026.10.4 plugin SDK, in CI.

## Checked on a live gateway (OpenClaw 2026.10.4)

- A linked install loads without a restart. `plugins inspect --runtime` shows `before_tool_call` at priority 100.
- An agent asked to add a job with webhook delivery to a non-routable URL was blocked before execution, through Tool Search. No job was created.
- In the same run, `list` succeeded.

## Not yet checked on a live gateway

- Chat delivery of a real reminder created by an agent while the plugin is loaded.
- `update` with a webhook route on an existing job (unit tests only).
- Code Mode calls (from the docs, not run).
- `allowAgents` with an id in another case than the agent's, such as `Ops` for `ops` (source and unit tests only).
- Flat dotted keys such as `'delivery.mode': 'webhook'` (OpenClaw 2026.10.5 source and unit tests only).
- A `to` URL without `//`, and a dotted `...to` key on `update`, reaching the host as a webhook (read from the 2026.10.5 build, unit tests only).
- A webhook route added by another plugin's `params` rewrite isn't seen (OpenClaw 2026.10.5 docs and source, not run).

## Checking it on your gateway

1. Run `openclaw plugins inspect webhook-guard --runtime --json`. The plugin should be loaded, with `before_tool_call` in `typedHooks`.
2. Ask an agent that can schedule jobs to create one with webhook delivery to a URL that can't resolve, such as one on the `.invalid` domain. Expect the block message, and no new job in `openclaw cron list --json --all`.
3. Ask it for a reminder delivered to the chat. Expect the reminder to arrive.
