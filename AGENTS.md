# AGENTS.md

Rules for working in this repo.

1. Block only what the plugin is for: a scheduling call with a webhook route, or one it can't read. Never block other tools, and never rewrite a call's parameters.
2. Fail closed on scheduling calls: unreadable parameters and unknown actions block. Update the action list from the OpenClaw source when a new version adds one.
3. Keep one rule per plugin. A different guard is a different plugin.
4. Hard-code no agent id; exemptions come only from `allowAgents`.
5. Keep everything setup-agnostic: no agent names, hostnames, paths, chat ids or job names from any real setup, in code, tests, docs, commits, issues or pull requests.
6. Build fixtures from synthetic parameters shaped like real OpenClaw tool calls.
7. Ship a fix with a test you have watched fail without it.
8. Before writing or changing a test, read https://github.com/splitleafhq/.github/blob/main/docs/testing.md.
9. Cite the OpenClaw version, and a docs page or source file, for any claim about OpenClaw behaviour, and label anything not yet checked on a live gateway as unverified in `docs/verification.md`.
10. Pin every tool and action to an exact version or commit.
11. Keep runtime dependencies at zero; import only `node:` built-ins and `openclaw/plugin-sdk/*`.
12. A comment states a constraint the code can't show, never what the next line does.
13. Write terse, factual prose.
14. Commit, push and open pull requests on the user's behalf; merging, tagging and releasing each need their own approval.
15. Keep agent-session links and session trailers out of commit messages, issues and pull request bodies.
