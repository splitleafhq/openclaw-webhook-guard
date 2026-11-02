# openclaw-webhook-guard

An [OpenClaw](https://docs.openclaw.ai) plugin (id `webhook-guard`) that stops agents from creating scheduled jobs that post their output to a URL.

OpenClaw's scheduler can deliver a job's result to a webhook, and `cron.webhookSsrfPolicy` only limits private and loopback targets. A public URL is always allowed. If an agent can schedule jobs, it can send whatever the job produces to any website. This plugin blocks that one route and leaves the rest of scheduling alone: reminders, recurring jobs and chat delivery all work.

**Status:** experimental. Built and tested against OpenClaw 2026.10.4. Not published on ClawHub or npm; install it from source. What has and hasn't been checked on a live gateway is in [docs/verification.md](docs/verification.md).

## What it blocks

A scheduling call (`cron`, alias `automations`) from an agent, when it creates or changes a job with any webhook route:

```text
Tool "openclaw:core:automations" was blocked before execution: Scheduled jobs cannot post to a URL (webhook delivery). Deliver to the chat instead, or ask the owner.
```

It also blocks a scheduling call it can't read, and an action it doesn't know, so a change after an OpenClaw upgrade can't slip past it. Details are in [docs/how-it-works.md](docs/how-it-works.md).

## Install

From a checkout:

```sh
openclaw plugins install --link --force /path/to/openclaw-webhook-guard
openclaw plugins enable webhook-guard
openclaw plugins inspect webhook-guard --runtime --json
```

- `--force` confirms a source that isn't on ClawHub.
- With no config, every agent is checked. To exempt one, list it: `openclaw config set plugins.entries.webhook-guard.config '{"allowAgents":["<agent id>"]}' --strict-json`. Config edits apply without a restart.
- `inspect` should show the plugin as loaded, with `before_tool_call` in `typedHooks`.

To turn it off, run `openclaw plugins disable webhook-guard`.

## Bounds

- **Scoped:** only scheduling calls, and only their webhook routes. Every other tool call passes untouched.
- **Fails closed:** a scheduling call it can't read is blocked, and OpenClaw blocks the call if the handler throws or times out.
- **Agents only:** jobs created from the CLI or the Control UI don't go through an agent's tools, so the hook never sees them.

## Develop

Requires Node 24.16 or later.

```sh
npm ci --ignore-scripts
npm run lint && npm run typecheck && npm test
```

A pre-push gate runs these checks before each push: `lefthook install` turns it on (`lefthook.yml`).

Run the checks in a separate clone, or delete `node_modules/` from a checkout you've installed with `--link`: OpenClaw maps `openclaw/plugin-sdk/*` to the gateway's own install, so a second copy can drift from the host.

## License

[MIT](LICENSE)
