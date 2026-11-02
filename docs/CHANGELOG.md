# Changelog

## Unreleased

First version, built and tested against OpenClaw 2026.10.4.

- Blocks scheduling calls (`cron`, `automations`) that create or change a job with a webhook route.
- Blocks scheduling calls it can't read and actions it doesn't know.
- Checks every agent; `allowAgents` exempts listed ones.
- Matches `allowAgents` ids in the host's canonical (lowercase) form.
- Treats `webhook` as a route only as a `mode` value, and ignores webhook-named keys set to `false`, `null`, `0` or empty.
- Reads flat dotted keys such as `'delivery.mode'` and `'job.delivery.to'` by their last segment, as the host nests them.
- Treats `https:host` (no `//`) and dotted keys ending in `to` as URL routes.
