# vajb-orbit-site

The public release-voting site for [Vajb Orbit](https://github.com/PAlllUCH/vajb-orbit).
The community votes on what the next release ships by adding a thumbs-up
reaction to one GitHub issue per candidate; this static page renders the
curated candidate list and the live counts.

Governing spec: `docs/design/VOTE_SITE_SPEC.md` in the game workspace.

## Run locally

```bash
python3 -m http.server 8123
```

then open `http://127.0.0.1:8123/`. Opening `index.html` straight from disk
shows the load-error state on purpose — the manifest is fetched, so the page
needs a server.

## Deploy

1. Create the public GitHub repo and push this folder as its root.
2. Repo settings -> Pages -> Deploy from branch, `main`, root.
3. Create the `vote-candidate` label once (it comes pre-selected by the issue
   template once it exists).

## Curate a cycle

1. Pick 8-12 candidates from the game's roadmap docs.
2. Create one issue per candidate from the template; note each issue number.
3. Update `data/candidates.json`: bump `cycle`, replace the list, set the
   previous cycle's outcome, refresh `votes_cached` from the issue pages.
4. Commit and push; Pages deploys automatically.

Top-voted candidate when the cycle is cut is what ships next.

## Fonts and licensing

Oxanium, Rajdhani and Saira Stencil One load from the Google Fonts CDN — the
same three OFL families the game uses; no font files are bundled here. No
game art ships in this repo. The LICENSE file is pending the owner's choice.
