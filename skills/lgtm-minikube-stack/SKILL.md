---
name: lgtm-minikube-stack
description: Scaffold a new project with a full Kubernetes platform stack on minikube — Istio service mesh, KEDA event-driven autoscaling, Strimzi (Kafka operator), CloudNativePG (Postgres operator), and the true Grafana LGTM observability stack (Loki + Grafana + Tempo + Mimir) with an OpenTelemetry Collector — plus opt-in Kiali, Apicurio schema registry, and OpenMetadata data catalog. Use whenever a user wants to start a new Kubernetes-on-minikube project, scaffold a runnable cluster from scratch, set up LGTM on minikube, install Istio/KEDA/Strimzi/CNPG on minikube, or get a single bootstrap script for a multi-component local cluster. Also triggers for "new tutorial project with Kubernetes", "minikube reference architecture", "single-node K8s with mesh and observability", or requests combining minikube with multiple platform components. Produces a project directory with bootstrap, per-component setup scripts, Grafana dashboards, and a portability reference — for developers starting a new project, not one-off setup.
---

# lgtm-minikube-stack Skill

A skill that scaffolds a fresh project directory with everything needed to bring up a
working Kubernetes platform stack on a single minikube node — the same shape used by
the data-mesh reference architecture, made reusable for any project that needs the same
substrate.

The output is a project tree (scripts, configs, dashboards, docs) the user commits to
their new repo. The skill is **not** a one-off setup procedure; the artifacts it
produces are meant to live in the project long-term.

## Host access rule (non-negotiable)

Host access to services on a local minikube cluster uses **NodePorts published to
the host at cluster creation**: `minikube start --ports=127.0.0.1:<nodePort>:<nodePort>,...` (loopback only; a bare `<p>:<p>` binds 0.0.0.0),
so `127.0.0.1:<nodePort>` reaches the service directly.
**Never** use SSH tunnels, `kubectl port-forward`, or `minikube tunnel`; they break
or disconnect mid-session. Ports are fixed at profile creation, so adding a NodePort
means recreating the profile (`./scripts/setup-profile.sh --replace`). On OpenShift,
use Routes.

## Runtime rule (non-negotiable)

- **Docker Engine + docker driver + containerd.** minikube runs
  `--driver=docker --container-runtime=containerd` (runc in the node) on Docker
  Engine (`docker-ce`, docker context `default`, `/var/run/docker.sock`). No
  desktop app is required. One pairing only; changing driver or runtime means
  recreating the profile. Fedora and RHEL hosts.
- **Images: build + load, no registry.** `docker build`, then
  `minikube -p <profile> image load <name>:<tag>`; Deployments use the bare
  name with `imagePullPolicy: Never`; `kubectl rollout restart` after a reload
  (`templates/build-image.sh.template`).
- **Never `minikube config set`.** Its config is global and shared by every
  project. Pass every flag on `minikube start`.
- **Explicit target on every call.** Unique profile name per project;
  `minikube -p <profile>`, `kubectl --context <profile>`,
  `helm --kube-context <profile>`. The scripts never read or change kubectl's
  current-context.
- **Host ports avoid host services.** Host port = NodePort (30000-32767);
  `setup-profile.sh` checks them with `ss -ltn` first. Cockpit owns `9090` on
  Fedora Server and RHEL, so never publish there (use `19090`).

## When to use this skill

Use whenever the user is:

- **Starting a new Kubernetes-on-minikube project** that needs a working platform
  stack from day one rather than weeks of integration work.
- **Standing up a reference architecture** on a laptop where the verified runtime is
  minikube but the architectural choices need to transfer to other Kubernetes runtimes.
- **Setting up the LGTM stack on Kubernetes** specifically (not as a compose stack —
  that's a different skill, `lgtm-docker-stack`).
- **Replacing ad-hoc setup scripts** with a tier-by-tier orchestrator that gates on
  health between layers.

## What the skill does NOT do

- It does not deploy application code. The output is the *substrate* — mesh, scaling,
  messaging, databases, observability — that application services run on top of.
- It does not configure for production. The verified runtime is single-node minikube;
  the chart values are sized for that. Production-scale configurations (HA, multi-AZ,
  capacity-planned resource requests) are out of scope.
- It does not install Docker Engine, minikube, kubectl, or helm themselves.
  `setup-profile.sh` fails fast if those aren't present and prints the install
  pointer; it does not install them automatically.
- It does not write tutorial prose or chapter pages. Pair with `lgtm-jekyll` (for the
  site) or `lgtm-tutorial` (for chapters) when those are needed.

## Decision tree

Before writing anything, figure out which feature flags the user actually wants. The
skill's bootstrap uses opt-in flags so the same template covers thin-substrate and
data-mesh-shaped projects:

| Flag                  | Default | What it installs                                        |
|-----------------------|---------|---------------------------------------------------------|
| `ENABLE_ISTIO`        | `true`  | Istio service mesh (control plane in `istio-system`)    |
| `ENABLE_KEDA`         | `true`  | KEDA core + HTTP add-on (in `keda` namespace)           |
| `ENABLE_KAFKA`        | `true`  | Strimzi operator + a single-node Kafka cluster          |
| `ENABLE_POSTGRES`     | `true`  | CloudNativePG operator + a single-node Postgres cluster |
| `ENABLE_LGTM`         | `true`  | Loki + Grafana + Tempo + Mimir + OTel Collector         |
| `ENABLE_KIALI`        | `true`  | Kiali mesh-topology UI (requires Istio)                 |
| `ENABLE_REDIS`        | `false` | Redis cache / pub-sub (single-node, no persistence)     |
| `ENABLE_APICURIO`     | `false` | Apicurio schema registry (for Kafka contracts)          |
| `ENABLE_OPENMETADATA` | `false` | OpenMetadata data catalog (heavy; data-mesh-specific)   |

Defaults are biased toward "what you actually need for a working Kubernetes substrate."
Apicurio and OpenMetadata are off by default because they're application-shaped pieces
that not every project needs. There is no Kafka UI flag — this collection prefers CLI
tooling, and Kafka is inspected with `kcat` instead.

## Workflow

When invoked, do this in order:

1. **Ask scoping questions** if not obvious from context:
   - What's the project name? (used for the minikube profile name and the namespace)
   - Does the project need a service mesh? (Istio)
   - Does the project need event-driven scaling? (KEDA)
   - Does the project use Kafka? (Strimzi)
   - Does the project use Postgres? (CloudNativePG)
   - Does the project need a data catalog? (OpenMetadata — heavy; rarely)
   - Does the project need a schema registry? (Apicurio — only with Kafka contracts)

   For each "yes", set the corresponding `ENABLE_*` flag in the bootstrap.

2. **Copy the templates** from `templates/` into the user's project tree at
   `scripts/` (or wherever they prefer; the bootstrap's path discovery handles either).

3. **Parameterize what's project-specific:** profile name, namespace, project title.
   The templates use `{{PROJECT_NAME}}` placeholders that need to be substituted.
   **Substitute UPPERCASE markers only.** The Grafana dashboards in
   `templates/grafana-dashboards/` contain lowercase Grafana template variables
   (`{{namespace}}`, `{{pod}}`, `{{service_name}}`) that are legitimate Grafana
   syntax — leave those alone. Concrete substitution targets:
   - `setup-profile.sh.template` — replace `{{PROFILE_NAME}}` with the project's
     minikube profile name (commonly the project name, lowercased)
   - `bootstrap.sh.template` — replace `{{PROFILE_NAME}}` and `{{NAMESPACE}}`
   - `teardown.sh.template` — replace `{{PROFILE_NAME}}`
   - `build-image.sh.template` — replace `{{PROFILE_NAME}}` and `{{NAMESPACE}}`
   - `cluster-status.sh.template` and every `setup-*.sh.template` — replace
     `{{PROFILE_NAME}}` (the default `KUBE_CONTEXT`) and `{{PROJECT_NAME}}`
   - `setup-lgtm.sh` has no markers; it requires `KUBE_CONTEXT`, which
     `bootstrap.sh` exports

4. **Drop in `setup-lgtm.sh`** (the LGTM observability stack) unchanged. It's
   parameter-free apart from the `OBS_NAMESPACE` env var (defaults to `observability`).
   Grafana, Loki and Tempo install from the `grafana-community` chart repo; Mimir
   from `grafana/mimir-distributed` with lean values embedded in the script.

5. **Drop in the Grafana datasources and sample dashboards** from
   `templates/grafana-datasources.yaml` and `templates/grafana-dashboards/`. These
   get provisioned by the Grafana helm chart at install time.

6. **Drop in the OTel Collector config** from `snippets/otel-collector-config.yaml`.
   It's referenced by `setup-lgtm.sh` as the Collector's config source.

7. **Walk through the preflight checklist** at
   `references/preflight-and-prerequisites.md`. Docker Engine (docker-ce, context
   `default`, user in the `docker` group) and the inotify limits need to be in
   place *before* the bootstrap runs the first time; `setup-profile.sh` fails
   fast with the exact fix if they aren't.

8. **Hand off with the README.** Tell the user to read `README.md` in the templates,
   which has the high-level component table and the bootstrap usage.

## Key principles (always apply)

These are the architectural decisions that distinguish a working stack from a
frustrating one — drawn from real lessons:

- **Newest stable versions, checked upstream.** Every component is pinned to its
  newest stable release (no rc/beta/alpha), re-checked at the start of work with
  `gh release list -R <org/repo> --exclude-pre-releases`, the chart repo's
  `index.yaml`, or `skopeo list-tags`. The Kubernetes version is the newest minor
  every component supports (intersect the support matrices); pass
  `--kubernetes-version` explicitly because minikube's default can run ahead.
  Never stay on an EOL line. Record any deliberate hold with its reason. The same
  rule applies to OpenShift/CRC operator CSV pins: install the newest CSV in the
  channel and approve only that InstallPlan. Pin table and re-check recipes:
  `references/versions.md`.

- **Newest UBI, newest runtime, exact tags.** Pick the newest UBI major that publishes the newest runtime (ubi10 over ubi9; Python 3.14 -> `ubi10/python-314-minimal`; JDK 25 -> `ubi10/openjdk-25`). If that combination doesn't exist, fall back to an older UBI major with the *same* runtime version (e.g. `ubi9/python-314`) -- never drop the runtime version to stay on a newer UBI, and never stay on an old runtime. Pin exact tags found with `skopeo list-tags docker://registry.access.redhat.com/<repo>` and confirmed with `skopeo inspect`. See `references/base-images.md`.

- **Tiered bring-up with health gates.** Each tier waits for the previous tier to be
  Ready before starting. A second-tier component that runs before its first-tier
  dependency is Ready will hang or fail in ways that look unrelated. The bootstrap's
  ten tiers (profile → mesh → DB op → DB CR → Kafka op → Kafka CR → KEDA → LGTM →
  Kiali → optional apps) are deliberate.

- **Per-component setup scripts, idempotent.** Each `setup-*.sh` script is safe to
  re-run. `helm upgrade --install` is the canonical pattern; combined with a
  pre-flight check that asks "is this already installed?", the bootstrap survives
  interruption and resume.

- **Opt-in by feature flag, not by stripped templates.** The bootstrap reads
  `ENABLE_*` env vars and conditionally runs each tier. Producing a slimmed-down
  bootstrap for projects that don't need (say) OpenMetadata is one env-var change,
  not a fork of the script.

- **The LGTM Collector is the single emission target.** Application services emit
  OTLP to the Collector at `otel-collector.observability.svc.cluster.local`. The
  Collector routes traces to Tempo, metrics to Mimir, logs to Loki. Applications
  never reach the storage backends directly. This is the convention that lets
  every signal-routing decision happen in one place.

- **Use OTLP HTTP (port 4318), not gRPC (port 4317), unless you have a reason.**
  HTTP is easier to debug (curl works), more firewall-friendly, and the
  performance difference is negligible for development.

- **Provision Grafana datasources and dashboards via YAML, not the UI.** The
  templates ship four datasources (Loki, Tempo, Mimir, Prometheus-via-Mimir) and
  four sample dashboards (one per datasource). Reproducible setups never require
  manual click-through.

- **Mesh selectively, not namespace-wide.** When Istio is enabled, the bootstrap
  does NOT label the application namespace for automatic injection. Per-deployment
  opt-in keeps Job pods (which hang at `1/2` when meshed) and operator-managed
  databases (TLS conflicts) out of the mesh by default. See `references/known-issues.md`.

- **Native sidecars in Istio 1.29+** (current pin: 1.31.1). `istio-proxy` injects as an `initContainer`
  with `restartPolicy: Always`. Mesh-membership checks must look at
  `.spec.initContainers`, not `.spec.containers`. A meshed pod still reports `2/2`.

- **Pin chart versions in setup scripts.** Each `setup-*.sh` declares its target
  version as an env var with a default. Unpinned charts work for a while and then
  break in non-obvious ways when the upstream chart adds a required value.

- **Host access = NodePorts published at cluster creation. No tunnels.** Services
  that need host access use `type: NodePort` with fixed ports in 30000-32767, and
  `setup-profile.sh` publishes them with `minikube start --ports=127.0.0.1:<np>:<np>,...`
  so `127.0.0.1:<nodePort>` reaches the service directly (verified with
  `docker port <profile>`).
  Never use SSH tunnels, `kubectl port-forward`, or `minikube tunnel` - they drop
  or disconnect mid-session. See `references/ports-and-endpoints.md` for the
  allocation map and the exact `--ports` list.

- **Open source only, no fees.** Every runtime, framework, library, image,
  operator and tool must be usable without a license fee, license key or paid
  subscription: anyone who clones the project runs it for free. Prefer the
  upstream open-source LTS, otherwise the latest stable. When a project's newest
  release moves to a commercial license, pin the newest open-source line instead
  and record why next to the pin (for example MassTransit 8.5.x under
  Apache-2.0 rather than the commercial 9.x). Check the license field on the
  registry (pom, nuspec, PyPI, chart) when bumping. Free-registration items such
  as the Red Hat pull secret for OpenShift Local are acceptable; paid ones are not.

## Reference files

Read these as needed, not preemptively. Their organization:

- `references/preflight-and-prerequisites.md` — Docker Engine install (Fedora and
  RHEL repos), docker group and context, inotify, node PID limit, host-port
  conflicts, tool versions.
  Read first; preflight has saved more hours than anything else in the skill.
- `references/versions.md` — The newest-stable rule, the full pin table, and the
  recipes for re-checking every version upstream. Read at the start of any work
  that installs or bumps a component.
- `references/known-issues.md` — Mesh-sidecar-vs-Job, mesh-sidecar-vs-managed-DB-TLS,
  native sidecars in Istio 1.29+, idle-node decay, the KEDA HTTP v0.14.0 panic
  (fixed in v0.15.0; pinned to 0.16.0), `ErrImageNeverPull` after a recreate, and
  why the stack does not use rootless podman.
- `references/ports-and-endpoints.md` — What runs where. Reference when wiring
  things together.
- `references/lgtm-on-minikube-sizing.md` — Memory/CPU footprint of L+G+T+M on a
  single node; how to trim if RAM is tight.
- `references/opt-in-flags.md` — The full flag model, what each flag does, what it
  depends on.
- `references/runtime-portability.md` — "Minikube is the verified runtime; here's
  what changes on EKS, GKE, OpenShift, vanilla K8s." Don't promise more than this
  document supports.
- `references/base-images.md` — Red Hat UBI base images for application containers.
  Read when writing Containerfiles or K8s Deployment manifests.

## Snippets

Drop-in reusable patterns:

- `snippets/otel-collector-config.yaml` — Canonical 3-signal Collector config:
  OTLP receivers, batch processor, exporters to Loki/Tempo/Mimir.
- `snippets/helm-repo-patterns.md` — Idempotent `helm repo add` / `helm repo update`
  patterns that don't fail on re-run.
- `snippets/readiness-wait-patterns.md` — `kubectl rollout status`, `kubectl wait
  --for=condition=Ready`, the right timeouts per component.

## What this skill explicitly does NOT do

- It does not produce a compose stack — that's `lgtm-docker-stack`.
- It does not produce Jekyll site content — pair with `lgtm-jekyll` or `lgtm-tutorial`.
- It does not produce slide decks — pair with `lgtm-presentation`.
- It does not install Docker Engine, minikube, kubectl, or helm; the preflight catches
  missing tools and prints the install command. The skill assumes the user is
  developing on a host where they can install those tools.
- It does not configure for production. Single-node minikube with monolithic LGTM
  components and modest resource requests. Production deployment is its own much
  larger topic.

## Multi-step work → `lgtm-relay`

Multi-component cluster work goes through the `lgtm-relay` skill: Opus selects and
sequences the components (operator ordering matters), Sonnet writes the per-component
setup scripts, Opus validates against a real bootstrap. Component installs that touch
the same manifests must be sequenced, not run as parallel executors.
