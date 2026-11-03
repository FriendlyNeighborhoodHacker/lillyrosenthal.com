# agent/ — the Discord engineer agent for lillyrosenthal.org

"SWE - lillyrosenthal.org" changes this site from a Discord thread. A question
gets an answer and nothing is created; a request is built in a worktree of its
own and shown at its own preview hostname
(`https://lillyrosenthal-<slug>.preview1.rosenthaltechnologies.com`),
posted when the build starts; on an explicit **approve** the bridge commits to
`main`, and the GitHub webhook rebuilds lillyrosenthal.org.

The bridge program that runs the agent is shared by every agent on the dev
VPS and lives in the `portal.bronxconservatory.org` repository
(`agent/bridge.py`, explained in its `docs/swe-bridge.md`). This directory is
the part that belongs to this site; the setup is in
[docs/engineer-agent.md](../docs/engineer-agent.md).

| File | Installed where | Purpose |
|---|---|---|
| `agent-prompt.md` | read from the agent's main clone on every turn | Who the agent talks to, how the plumbing works, this site's rules (slides and media keys; no new clips from the server) |
| `settings.json` | read from the main clone on every turn | Claude Code permissions: npm build, node, read-only git allowed; git mutations, media import/upload, sudo and secrets denied |
| `preview-setup.sh` | run from the main clone inside each worktree | Builds the preview the way `scripts/deploy.sh` builds production: `.env`, `npm ci`, `npm run build`, `dist/` published |
| `agent.env.example` | `~lillyrosenthal/agents/lillyrosenthal.org/agent.env` | Auth, Discord token, model, preview prefix, limits |
| `swe-lillyrosenthal.org.service` | `/etc/systemd/system/` | Runs the shared bridge as `lillyrosenthal` with this agent's environment |

Changing the agent is a normal change to this repository: edit here, push to
`main`, and the next new thread uses it (the main clone syncs on every new
thread).
