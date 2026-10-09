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

Eighteen skills. Full descriptions and bundled assets are in
[`docs/CATALOG.md`](docs/CATALOG.md) (generated from each skill's frontmatter).

| Skill | In one line |
|-------|-------------|
| `lgtm-diagram-generator` | Paired SVG + `.excalidraw` technical diagrams from a short Python spec. |
| `lgtm-jekyll` | Scaffold a chapter-based Jekyll/GitHub Pages docs or tutorial site, or a post-based blog, in the house style. |
| `lgtm-tutorial` | Author and extend chapter content + runnable examples on a Jekyll tutorial site. |
| `lgtm-presentation` | Red Hat-branded 16:9 `.pptx` decks built programmatically with pptxgenjs. |
| `lgtm-professional-voice` | Voice pass for sites, workshops, and decks written for engineers — scan script, ranked rules, before/after examples. |
| `lgtm-docker-stack` | Local Grafana LGTM observability stack (plus Postgres, Kafka, Apicurio) via **docker compose**. |
| `lgtm-podman-stack` | Local Grafana LGTM observability stack via **podman compose**. |
| `lgtm-minikube-stack` | Full Kubernetes platform stack (mesh, operators, LGTM) on **minikube**. |
| `lgtm-crc` | A project's **OpenShift Local (CRC)** path: pinned operators, in-cluster builds, restricted-v2 chart, platform tier, clean teardown. |
| `lgtm-quarkus` | Scaffold a Quarkus project with full dev toolchain — SDKMAN, Quarkus CLI, Agent MCP, observability, and testing. |
| `lgtm-camel` | Scaffold an Apache Camel project — Camel CLI/TUI/MCP, Citrus testing, Camel on Quarkus by default. |
| `lgtm-spring-boot` | Scaffold a Spring Boot 4 project — SDKMAN toolchain (JDK 25, Maven, Spring Boot CLI), OTel + Micrometer, Testcontainers + Newman testing, kcat, UBI 10. |
| `lgtm-python` | Scaffold a Python 3.14 project — uv toolchain, FastAPI/gRPC/GraphQL/Kafka/Postgres shapes, OTel, pytest + ruff + Testcontainers + Newman, kcat, UBI 10. |
| `lgtm-github` | Create a private **GitHub** repo and run the release-sync / commit-convention workflow (`gh`, PRs). |
| `lgtm-gitlab` | Create a private **GitLab** project and run the release-sync / commit-convention workflow (`glab`, MRs). |
| `lgtm-caveman` | Ultra-compressed response style — ~65% fewer output tokens, full technical accuracy. |
| `lgtm-relay` | Three-phase model relay: Opus plans, Sonnet 5 executes, Opus validates. |
| `lgtm-systems-programming` | Kernel/eBPF conventions, behavioral verification, and a throwaway KVM VM lab. |

## How the skills fit together

They are designed to compose, not just coexist:

- **`lgtm-github` and `lgtm-gitlab` are the connective tissue.** Every other skill's
  project is created, committed, and shipped through their private-repo + release-sync
  workflow under one Conventional Commits convention — `lgtm-github` for GitHub-hosted
  projects (`gh`, PRs), `lgtm-gitlab` for GitLab-hosted ones (`glab`, MRs). This very
  repo follows it.
- **`lgtm-quarkus`, `lgtm-camel`, `lgtm-spring-boot`, and `lgtm-python` scaffold the
  service runtimes.** `lgtm-quarkus` stands up a Quarkus project (SDKMAN toolchain,
  Quarkus Agent MCP, observability, testing); `lgtm-camel` scaffolds Apache Camel
  integration projects, defaulting to Camel on Quarkus, and both wire up their MCP
  servers for AI-assisted development. `lgtm-spring-boot` scaffolds a Spring Boot 4
  project (SDKMAN JDK 25, Spring Boot CLI) and `lgtm-python` a Python 3.14 project
  (uv, FastAPI/gRPC/GraphQL). All four share the house conventions — OpenTelemetry
  observability from day one, structured file logging for Claude, layered testing
  with Testcontainers + Newman, kcat over a Kafka GUI, and UBI 10 Containerfiles.
- **`lgtm-diagram-generator` feeds the content skills.** The paired SVG + Excalidraw
  figures it emits are the diagram format consumed by `lgtm-jekyll`,
  `lgtm-tutorial`, and `lgtm-presentation`, so figures look uniform across a site,
  a tutorial, and a deck.
- **`lgtm-jekyll` and `lgtm-tutorial` are scaffolding vs. authoring.** `lgtm-jekyll`
  stands up the site structure (layouts, navigation, theme); `lgtm-tutorial` is the
  topic-agnostic companion that writes and extends chapters and runnable examples on
  top of that structure.
- **`lgtm-docker-stack`, `lgtm-podman-stack`, and `lgtm-minikube-stack` are three
  runtimes for the same observability stack.** Same Grafana LGTM stack (Loki + Grafana +
  Tempo + Mimir + OpenTelemetry Collector), different substrate: docker compose or
  podman compose for lightweight local dev, or a full minikube Kubernetes platform with
  Istio/KEDA/Strimzi/CNPG when the architecture needs to transfer to a cluster.
  `lgtm-minikube-stack` is the cluster-based sibling of the two compose runtimes.
- **`lgtm-crc` is the Red Hat counterpart of `lgtm-minikube-stack`.** Same
  architecture on OpenShift Local: OperatorHub operators pinned with Manual
  approval, images built inside the cluster (binary S2I, Mandrel native),
  pods under `restricted-v2`, Routes for host access, OSSM 3 / Custom Metrics
  Autoscaler / OpenTelemetry / OpenShift GitOps for the platform tier, and a
  teardown that returns the CRC to empty. Typically an optional appendix next
  to a compose or minikube main path.
- **`lgtm-presentation` is the standalone deliverable** that still shares the diagram
  generator and the Red Hat house style with the rest.
- **`lgtm-professional-voice` is the editorial pass over all three content skills.**
  `lgtm-tutorial`, `lgtm-jekyll`, and `lgtm-presentation` own structure and layout;
  this skill owns sentence-level voice for an engineering audience. Its scan script
  counts verbal tics, defensive and confessional phrasing, filename slide titles, and
  leaked tracking codes across a site or deck source, and its per-file mode splits a
  large sweep across `lgtm-relay` executors.
- **`lgtm-systems-programming` is the domain companion.** The tutorial and site skills
  are deliberately topic-agnostic; this one supplies what bites you when the subject is
  kernel-adjacent — behavioral verification (a program that loads is not a program that
  works) and a disposable KVM lab so experimental kernel code never runs on your own
  machine. Pair it with `lgtm-tutorial` when the tutorial's subject is systems code.
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
│   ├── install-all.sh        # sync skills/ → ~/.claude/skills
│   └── package-all.sh        # build dist/<name>.skill for each skill
├── skills/
│   ├── lgtm-camel/
│   ├── lgtm-caveman/
│   ├── lgtm-crc/
│   ├── lgtm-diagram-generator/
│   ├── lgtm-docker-stack/
│   ├── lgtm-github/
│   ├── lgtm-gitlab/
│   ├── lgtm-jekyll/
│   ├── lgtm-minikube-stack/
│   ├── lgtm-podman-stack/
│   ├── lgtm-presentation/
│   ├── lgtm-professional-voice/
│   ├── lgtm-python/
│   ├── lgtm-quarkus/
│   ├── lgtm-relay/
│   ├── lgtm-spring-boot/
│   ├── lgtm-systems-programming/
│   └── lgtm-tutorial/
└── dist/                     # build output (git-ignored); ships on Releases
```

## Working with the skills

### Install locally

```bash
scripts/install-all.sh                 # sync every skill → ~/.claude/skills
scripts/install-all.sh lgtm-github     # just one
scripts/install-all.sh --dry-run       # show what would change
```

This repo is the source of truth: each skill directory is replaced outright, so
files deleted here disappear from the install too. Destination is
`~/.claude/skills`, override with `CLAUDE_SKILLS_DIR`.

Skills installed locally but **absent from this repo are never touched** — they're
reported as orphans at the end of the run. An orphan means either a skill authored
locally and never imported, or a rename that left the old directory behind. Both
want a human decision, so the script reports and stops rather than deleting.

Restart Claude Code afterward to pick up added, renamed, or removed skills.

### Package for installation

```bash
scripts/package-all.sh                 # all skills → dist/<name>_rNN.x.skill
scripts/package-all.sh lgtm-github     # just one
REL=r2.x scripts/package-all.sh        # build for a specific release
```

The version comes from `REL`, or from the latest `r*` git tag. Building all skills
also writes `dist/lgtm-skills_rNN.x.sha256sums.txt`. The script warns if `HEAD`
isn't at the tag it derived, or if the tree is dirty — both mean the artifacts
wouldn't match the release they're named for.

Each `.skill` is a zip whose single top-level entry is the skill directory. **The
version appears only in the filename** — the directory inside the zip stays bare
`<name>/`, since that path is the skill's identity to Claude and a versioned one
would install as a separate skill on every release.

Install by uploading the `.skill` file in Claude's skill settings. Build artifacts
live in the git-ignored `dist/` and are attached to GitHub Releases rather than
committed.

### Edit a skill

Edit the source under `skills/<name>/`, then keep the docs in sync:

```bash
python3 scripts/gen-catalog.py         # refresh docs/CATALOG.md from frontmatter
```

Renaming a skill means changing its `name:` frontmatter **and** its directory, then
grepping the other skills for cross-references (e.g. `lgtm-minikube-stack` names
`lgtm-podman-stack`). Re-run the catalog generator afterward.

### Conventions that apply across skills

- **Host access to local minikube services uses NodePorts published at cluster
  creation** (`minikube start --ports=127.0.0.1:<np>:<np>,...`). Never SSH tunnels,
  `kubectl port-forward`, or `minikube tunnel`; they disconnect mid-session.
  Details in `skills/lgtm-minikube-stack/SKILL.md`.
- **On OpenShift Local, host access uses edge-TLS Routes**, and the CRC is
  dedicated to one project at a time: `teardown.sh` removes everything it
  installed, then `crc stop`. Run one local cluster at a time. Details in
  `skills/lgtm-crc/SKILL.md`.

### Commit convention

Commits follow the `type(scope): summary` convention documented in
[`skills/lgtm-github/references/commit-conventions.md`](skills/lgtm-github/references/commit-conventions.md)
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
