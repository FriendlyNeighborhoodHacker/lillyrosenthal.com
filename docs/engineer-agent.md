# Engineer agent ("SWE - lillyrosenthal.org")

A Claude Code agent that changes this site from Discord. Lilly or Brian
describes a change in the agent's channel; it answers questions outright,
builds requests in a git worktree of their own, shows each one at its own
preview hostname, and when a shipper says **approve** the bridge commits to
`main` and pushes. The GitHub webhook then rebuilds lillyrosenthal.org as it
does for any push (README, "Deploying"), so nothing more is needed to go live.

This is the setup guide for this site's agent. It runs on the dev VPS
(208.113.209.171, sudo account `debian`) as the `lillyrosenthal` account,
an "engineer" account that can take on several sites, each in its own
`~/agents/<site>/`; this site is `~/agents/lillyrosenthal.org/`. The bridge
program and the preview scheme are shared by every agent on the machine and
are documented in the `portal.bronxconservatory.org` repository:

- `docs/swe-bridge.md`: what the bridge does, the thread words (**status**,
  **discard**, **approve**), how a thread goes from conversation to build,
  the `agent/` contract, the machine-wide install, and the pitfalls every
  agent has in common.
- `docs/preview-hosts.md`: `<prefix>-<slug>.preview1.rosenthaltechnologies.com`,
  one wildcard record and certificate for the machine, one vhost per account.

Both are already set up on the VPS, and the `lillyrosenthal` account is
provisioned with the prefix `lillyrosenthal-`. This document covers only what
is particular to lillyrosenthal.org.

## How a preview is made here

The site has to be built: `npm run build` (`scripts/build.mjs`) produces
`dist/`, with the media loaded from the Cloudflare bucket named by
`PUBLIC_MEDIA_BASE`. So the agent runs in `PREVIEW_MODE=build`: each
request's worktree lives at `~/agents/lillyrosenthal.org/worktrees/<slug>/`
and is never served; after the worktree is created and after every agent
turn the bridge runs [agent/preview-setup.sh](../agent/preview-setup.sh)
in it, which copies the preview `.env` in, runs `npm ci` and `npm run build`,
and publishes `dist/` (minus the webhook file) at
`~/previews/lillyrosenthal-org-<slug>/www/`. The first build in a fresh
worktree installs the npm packages, about a minute; later builds are quick.
The server never holds clips: the preview plays video from the bucket like
production does, and the agent cannot import or upload media (that needs
Lilly's Dropbox and the R2 keys, which stay on the laptop).

| Path (account `lillyrosenthal`) | Purpose |
|---|---|
| `~/agents/lillyrosenthal.org/agent.env` | this agent's auth and knobs (template: `agent/agent.env.example`) |
| `~/agents/lillyrosenthal.org/.env` | the preview build's `.env`: just `PUBLIC_MEDIA_BASE`, no R2 keys |
| `~/.nvm/` | Node 22 (the site needs 22.12 or newer; Debian's package is older) |
| `~/agents/lillyrosenthal.org/repo/` | main clone of this repository, always on `main`; the prompt, permissions and hook are read from its `agent/` |
| `~/agents/lillyrosenthal.org/worktrees/<slug>/` | one worktree per building thread, branch `feature/<slug>` |
| `~/previews/lillyrosenthal-org-<slug>/www/` | the built preview, served as `https://lillyrosenthal-org-<slug>.preview1.rosenthaltechnologies.com` |

| Host / service | |
|---|---|
| Previews | `lillyrosenthal-org-*.preview1.rosenthaltechnologies.com` (vhost `preview-lillyrosenthal.conf`) |
| Bridge | systemd `swe-lillyrosenthal.org.service`, runs `/usr/local/lib/swe-bridge/bridge.py` as `lillyrosenthal` |
| Discord | bot **SWE - lillyrosenthal.org**, its own channel, roles `builder` / `shipper` |
| Production | unchanged: push to `main` → `gitwebhook.php` on the DreamHost VPS runs `scripts/deploy.sh` |

Every step names the account. From `debian`, `sudo -iu lillyrosenthal` gives
a shell as the agent account; `exit` returns. Steps marked **BRIAN** need a
browser session or a secret. No step needs the account to have sudo.

## Setup

**0. Prerequisites (as debian).** Already done on this machine; check:

```
ls -l /etc/apache2/sites-enabled/preview-lillyrosenthal.conf /usr/local/lib/swe-bridge/bridge.py
```

### As lillyrosenthal (`sudo -iu lillyrosenthal`)

**1. Node 22 via nvm.** No root needed; the hook loads it itself.

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exit; sudo -iu lillyrosenthal                        # new login so nvm is on PATH
nvm install 22
node -v                                              # v22.x
```

**2. Claude Code.** Fable needs Claude Code 2.1.251 or newer.

```
curl -fsSL https://claude.ai/install.sh | bash
exit; sudo -iu lillyrosenthal
claude --version
```

**3. Deploy key and the main clone.** The bridge pushes `main`, so the key
needs **write** access.

```
ssh-keygen -t ed25519 -N "" -C "lillyrosenthal-agent@dev-vps"
cat ~/.ssh/id_ed25519.pub
```

**BRIAN:** GitHub → `FriendlyNeighborhoodHacker/lillyrosenthal.com` →
Settings → Deploy keys → Add deploy key, title `swe agent (dev VPS)`, tick
**Allow write access**. Then:

```
ssh -T git@github.com                      # "Hi FriendlyNeighborhoodHacker/lillyrosenthal.com! ..."
mkdir -p ~/agents/lillyrosenthal.org/worktrees ~/agents/lillyrosenthal.org/diffs ~/previews
git clone git@github.com:FriendlyNeighborhoodHacker/lillyrosenthal.com.git ~/agents/lillyrosenthal.org/repo
git -C ~/agents/lillyrosenthal.org/repo config user.name "SWE lillyrosenthal.org"
git -C ~/agents/lillyrosenthal.org/repo config user.email "swe-agent@lillyrosenthal.org"
```

**4. The preview `.env`.** Only the media origin; the R2 keys never go on
this machine.

```
printf 'PUBLIC_MEDIA_BASE=https://lillyrosenthalmedia.com\n' > ~/agents/lillyrosenthal.org/.env
chmod 600 ~/agents/lillyrosenthal.org/.env
```

(Use whatever `PUBLIC_MEDIA_BASE` production's secrets `.env` has.)

**5. Smoke-test a preview by hand**, exactly the way the bridge makes one.
The `npm ci` is the slow part the first time.

```
git -C ~/agents/lillyrosenthal.org/repo worktree add -b feature/smoke ~/agents/lillyrosenthal.org/worktrees/smoke main
cd ~/agents/lillyrosenthal.org/worktrees/smoke
PREVIEW_ROOT=$HOME/previews/lillyrosenthal-org-smoke/www bash agent/preview-setup.sh
ls ~/previews/lillyrosenthal-org-smoke/www                 # index.html, snoopy/, ..., no gitwebhook.php, no media/
curl -sI https://lillyrosenthal-org-smoke.preview1.rosenthaltechnologies.com/ | head -1          # HTTP/1.1 200
curl -sI https://lillyrosenthal-org-smoke.preview1.rosenthaltechnologies.com/snoopy/ | head -1   # HTTP/1.1 200
```

Open it in a browser: the slideshow should play, with video coming from the
bucket. Then clean up:

```
cd
rm -rf ~/previews/lillyrosenthal-org-smoke
git -C ~/agents/lillyrosenthal.org/repo worktree remove --force ~/agents/lillyrosenthal.org/worktrees/smoke
git -C ~/agents/lillyrosenthal.org/repo branch -D feature/smoke
```

**6. Auth and settings.** Copy the template, then choose how the agent
authenticates: a Console API key in the file, or a Claude login stored under
this account (`cd ~/agents/lillyrosenthal.org/repo && claude`, then `/login`,
follow the URL and code, `/exit`, and accept the folder trust prompt). A
login means the agent's usage counts against that person's subscription.

```
cp ~/agents/lillyrosenthal.org/repo/agent/agent.env.example ~/agents/lillyrosenthal.org/agent.env
chmod 600 ~/agents/lillyrosenthal.org/agent.env
vim ~/agents/lillyrosenthal.org/agent.env                 # auth as chosen; Discord values come in step 7
```

Prove it (the second command must report that the commit was refused):

```
set -a; source ~/agents/lillyrosenthal.org/agent.env; set +a
cd ~/agents/lillyrosenthal.org/repo
claude -p "Reply with the single word ok." --model "$CODE_MODEL" --output-format text
claude -p "Run exactly: git commit --allow-empty -m test. Report whether it ran." --model "$CODE_MODEL" \
  --permission-mode dontAsk --settings agent/settings.json --append-system-prompt-file agent/agent-prompt.md
```

### Discord and the service

**7. Discord (BRIAN, about 10 minutes).** In the `Rosenthal Ops` server,
create a channel for this agent (suggested: `#lillyrosenthal-features`) that
`builder` and `shipper` can see and post in, with threads allowed, and
`@everyone` cannot. Give Lilly `builder` and, if she should be able to
deploy, `shipper`.

New bot application at discord.com/developers/applications: **New
Application** → name `SWE - lillyrosenthal.org` → **Bot** → Reset Token (copy
it: `DISCORD_BOT_TOKEN`), Public Bot off, **both** Privileged Gateway Intents
on (Server Members, Message Content) → **OAuth2 → URL Generator**: scope
`bot`; permissions View Channels, Send Messages, Send Messages in Threads,
Create Public Threads, Read Message History, Attach Files, Add Reactions →
open the URL and authorize it into the server. Give the bot's role access to
the channel. Right-click the channel → Copy Channel ID (`DISCORD_CHANNEL_ID`).
Put both values in `~lillyrosenthal/agents/lillyrosenthal.org/agent.env`.

**8. Service (as debian).**

```
sudo cp /home/lillyrosenthal/agents/lillyrosenthal.org/repo/agent/swe-lillyrosenthal.org.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now swe-lillyrosenthal.org
journalctl -fu swe-lillyrosenthal.org -o cat      # "bridge ready as SWE - lillyrosenthal.org#…; model fable; previews lillyrosenthal-org-*.… (build)"
```

### First run: a trivial, safe change

Nothing is created, and no preview link is posted, until the agent starts a
change.

- [ ] Post in the channel: *Which pages does the site have?* A thread and the answer, nothing else. `status` lists it as "talking".
- [ ] Post: *Swap the first two slides on the Snoopy page.* The bot posts a short plan, then "Building on branch `feature/<slug>`" with a `lillyrosenthal-org-<slug>` preview link (allow a minute for the first build), then the report: what changed, a `Preview:` link to `/snoopy/`, a `Commit message:` line, and `changes.diff` touching `src/data/snoopySlides.ts`.
- [ ] Open the preview: the Snoopy slideshow starts with the other clip.
- [ ] Reply **discard**: the preview link returns 404; `git -C ~lillyrosenthal/agents/lillyrosenthal.org/repo worktree list` shows only the main clone.
- [ ] Repeat the request, then **approve** from a shipper. The bridge posts the sha, the commit is on GitHub `main`, GitHub → Settings → Webhooks shows the delivery, and lillyrosenthal.org/snoopy/ shows the new order within a minute or two. Then request swapping them back the same way.
- [ ] Something the server cannot do: *Add the new monologue clip to the Speeches page.* It should explain that the clip has to be imported and uploaded from the laptop first, not try.
- [ ] Ask the agent in-thread to *commit this for me*: it declines and explains that approve does it.

## Day to day

- **Change the agent.** Edit `agent/agent-prompt.md`, `agent/settings.json`
  or `agent/preview-setup.sh`, push to `main`; the next new thread uses them.
  The bridge program is shared: `docs/swe-bridge.md` in the portal repository.
- **Keep two things in step** when the build changes: `scripts/deploy.sh`
  and `agent/preview-setup.sh` build the same thing.
- **New clips** still go through the laptop: `npm run import-media`,
  `npm run upload-media`, commit `media.generated.json`, push. After that the
  agent can place the new key on a page.
- **Logs.** `journalctl -fu swe-lillyrosenthal.org -o cat`; Apache for all of
  this account's previews is `/var/log/apache2/preview-lillyrosenthal-*.log`;
  Claude Code transcripts under `~lillyrosenthal/.claude/projects/`.

## Pitfalls particular to this site

| Symptom | Cause | Fix |
|---|---|---|
| "Couldn't create a working tree" with `npm not found` | nvm not installed for this account, or Node 22 not installed in it | step 1 |
| hook fails with "PUBLIC_MEDIA_BASE not set" | `~/agents/lillyrosenthal.org/.env` missing or blank | step 4 |
| hook fails with "Refusing to build: PUBLIC_MEDIA_BASE is blank" | same, from `scripts/build.mjs` | step 4 |
| preview loads but videos do not play | `PUBLIC_MEDIA_BASE` points at the wrong origin, or the bucket is not public | compare with production's secrets `.env` |
| the agent put a key on a page and the preview shows a broken slide | the key is not in `media.generated.json` (clip never imported) | import and upload from the laptop, push, then ask again |
| approve succeeded but lillyrosenthal.org is unchanged | the DreamHost webhook delivery failed or `deploy.sh` died | GitHub → Webhooks → Recent Deliveries; `~/deploy/lillyrosenthal.org.deploy.log` on the production account |

Everything else (Discord intents, model version, permission file, deploy key
rights, parking, conflict handling) is in `docs/swe-bridge.md`.
