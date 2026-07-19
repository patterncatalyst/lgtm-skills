# lgtm-skills

Private source-of-truth for the **`lgtm-*` Claude Skills collection** — a set of
authored [Agent Skills](https://docs.claude.com) that encode house conventions for
technical content and cloud-native tooling: themed diagrams, Jekyll docs sites,
Red Hat-branded slide decks, local and Kubernetes observability stacks, the
git/release workflow that ties them together, and a compressed response style for
working through it all.

Each skill lives under [`skills/`](skills/) as its canonical source. This repo is
where they are versioned, documented, and packaged for installation into Claude.

## Catalog

Nine skills. Full descriptions and bundled assets are in
[`docs/CATALOG.md`](docs/CATALOG.md) (generated from each skill's frontmatter).

| Skill | In one line |
|-------|-------------|
| `lgtm-diagram-generator` | Paired SVG + `.excalidraw` technical diagrams from a short Python spec. |
| `lgtm-jekyll` | Scaffold a chapter-based Jekyll/GitHub Pages docs or tutorial site in the house style. |
| `lgtm-tutorial` | Author and extend chapter content + runnable examples on a Jekyll tutorial site. |
| `lgtm-presentation` | Red Hat-branded 16:9 `.pptx` decks built programmatically with pptxgenjs. |
| `lgtm-podman-stack` | Local Grafana LGTM observability stack via **podman compose**. |
| `lgtm-minikube-stack` | Full Kubernetes platform stack (mesh, operators, LGTM) on **minikube**. |
| `lgtm-git` | Create the private repo and run the release-sync / commit-convention workflow. |
| `lgtm-caveman` | Ultra-compressed response style — ~65% fewer output tokens, full technical accuracy. |
| `lgtm-relay` | Three-phase model relay: Opus plans, Sonnet 5 executes, Opus validates. |

## How the skills fit together

They are designed to compose, not just coexist:

- **`lgtm-git` is the connective tissue.** Every other skill's project is created,
  committed, and shipped through its private-repo + release-sync workflow under one
  Conventional Commits convention. This very repo follows it.
- **`lgtm-diagram-generator` feeds the content skills.** The paired SVG + Excalidraw
  figures it emits are the diagram format consumed by `lgtm-jekyll`,
  `lgtm-tutorial`, and `lgtm-presentation`, so figures look uniform across a site,
  a tutorial, and a deck.
- **`lgtm-jekyll` and `lgtm-tutorial` are scaffolding vs. authoring.** `lgtm-jekyll`
  stands up the site structure (layouts, navigation, theme); `lgtm-tutorial` is the
  topic-agnostic companion that writes and extends chapters and runnable examples on
  top of that structure.
- **`lgtm-podman-stack` and `lgtm-minikube-stack` are two runtimes for the same
  observability stack.** Same Grafana LGTM stack (Loki + Grafana + Tempo + Mimir +
  OpenTelemetry Collector), different substrate: lightweight podman-compose for local
  dev, or a full minikube Kubernetes platform with Istio/KEDA/Strimzi/CNPG when the
  architecture needs to transfer to a cluster. `lgtm-minikube-stack` explicitly points
  at `lgtm-podman-stack` as its compose-based sibling.
- **`lgtm-presentation` is the standalone deliverable** that still shares the diagram
  generator and the Red Hat house style with the rest.
- **`lgtm-relay` routes the work the others do.** Where the content and stack skills
  define *what* good output looks like, the relay defines *how the work is routed*:
  Opus plans, Sonnet 5 executes against that plan, Opus validates the result. The
  multi-step operations in `lgtm-jekyll`, `lgtm-tutorial`, `lgtm-presentation`, and
  both stack skills point at it, and it is mandatory under `ultracode` / `ultraplan`.
  Because subagents don't inherit loaded skills, the calling skill's conventions get
  restated in each executor prompt.
- **`lgtm-caveman` is orthogonal to all of them.** It changes how Claude *talks*, not
  what it builds — a compressed prose style (`lite` / `full` / `ultra`) that can be on
  while any other skill runs. It never touches code, commits, or PR text, and it stands
  down automatically for security warnings and destructive-action confirmations.

## Repository layout

```
lgtm-skills/
├── README.md
├── docs/
│   └── CATALOG.md            # generated skill catalog (frontmatter → markdown)
├── scripts/
│   ├── gen-catalog.py        # regenerate docs/CATALOG.md
│   └── package-all.sh        # build dist/<name>.skill for each skill
├── skills/
│   ├── lgtm-caveman/
│   ├── lgtm-diagram-generator/
│   ├── lgtm-git/
│   ├── lgtm-jekyll/
│   ├── lgtm-minikube-stack/
│   ├── lgtm-podman-stack/
│   ├── lgtm-presentation/
│   ├── lgtm-relay/
│   └── lgtm-tutorial/
└── dist/                     # build output (git-ignored); ships on Releases
```

## Working with the skills

### Package for installation

```bash
scripts/package-all.sh                 # all skills → dist/*.skill
scripts/package-all.sh lgtm-git        # just one
```

Each `.skill` is a zip whose single top-level entry is the skill directory. Install
by uploading the `.skill` file in Claude's skill settings. Build artifacts live in
the git-ignored `dist/` and are meant to be attached to GitHub Releases rather than
committed.

### Edit a skill

Edit the source under `skills/<name>/`, then keep the docs in sync:

```bash
python3 scripts/gen-catalog.py         # refresh docs/CATALOG.md from frontmatter
```

Renaming a skill means changing its `name:` frontmatter **and** its directory, then
grepping the other skills for cross-references (e.g. `lgtm-minikube-stack` names
`lgtm-podman-stack`). Re-run the catalog generator afterward.

### Commit convention

Commits follow the `type(scope): summary` convention documented in
[`skills/lgtm-git/references/commit-conventions.md`](skills/lgtm-git/references/commit-conventions.md)
— types `docs` `site` `demo` `ci` `chore` `fix` `feat` `refactor` `style`; imperative
subject, ≤ 72 chars, no trailing period.

## Creating the repo (first push)

From this directory, with `gh` installed and authenticated:

```bash
git init -b main
git add -A
git commit -m "chore: initial import of the lgtm-* skills collection"

gh repo create lgtm-skills --private --source=. --remote=origin \
  --description "Private source-of-truth for the lgtm-* Claude Skills collection" \
  --push
```

`--private` is explicit and intentional — this repo is private by default.
