---
name: lgtm-crc
description: Scaffold an OpenShift Local (CRC) appendix or stack for a project — CRC sizing and start with the crc-admin kubeconfig context (no password handling), a lib.sh with require_crc and a pinned-CSV install_operator (Manual approval, startingCSV, approve only the named InstallPlan), AMQ Streams Kafka, in-cluster image builds (binary S2I with quarkus-openshift on ubi10/openjdk-25, and a Docker-strategy Mandrel build for native), a Helm chart built for restricted-v2 with edge-TLS Routes, and an opt-in platform tier — OpenShift Service Mesh 3 + Kiali with STRICT mTLS and a canary, Custom Metrics Autoscaler (KEDA), Red Hat build of OpenTelemetry with grafana/otel-lgtm, Ollama, OpenShift GitOps (Argo CD) — plus evidence capture with a secret scrub and a teardown that removes every operator, CRD and namespace and then runs crc stop. Use whenever a user wants to run a project on OpenShift Local / CRC, add a Red Hat or OpenShift appendix to a workshop or tutorial, port a minikube or compose stack to OpenShift, install operators from OperatorHub with pinned versions, build Quarkus images inside OpenShift without a container engine, make a chart pass restricted-v2, expose services with Routes, or clean a CRC instance back to empty. Also triggers for "crc start", "OpenShift Local", "oc new-project", "OperatorHub subscription", "OSSM 3", "Sail operator", "Custom Metrics Autoscaler", "OpenShift GitOps", "S2I build", "restricted-v2 SCC", "anyuid", or "tear down CRC".
---

# lgtm-crc Skill

Scaffolds an `openshift/` directory that runs a project on **OpenShift Local
(CRC)**: the core (project, Kafka, in-cluster image builds, a Helm chart with
Postgres and Routes) and an opt-in platform tier (mesh, autoscaling,
tracing, AI, native, GitOps), with evidence capture and a teardown that
returns the CRC to empty. It is the Red Hat sibling of `lgtm-minikube-stack`:
same architecture, OpenShift-native mechanisms (OLM, SCCs, Routes, S2I).

Everything here was verified end to end on CRC 2.64.0 / OpenShift 4.22.14
(2026-10-09) on a reference project with seven Quarkus services; the
templates are that project's scripts with the names generalised.

## When to use this skill

- A project needs an **OpenShift Local** path, usually as an optional
  appendix next to a compose or minikube main path.
- Porting a minikube/compose stack to OpenShift: operators via OperatorHub,
  pods under `restricted-v2`, Routes instead of NodePorts, images built in
  the cluster.
- Installing Red Hat operators with **pinned, manually approved** versions.
- Building Quarkus (JVM or native) images **inside** OpenShift with no host
  container engine.
- Cleaning a CRC back to empty after use.

## Placeholders

Templates use `__UPPER__` markers (not `{{...}}`, which would collide with
Helm). Substitute them once when scaffolding:

| Marker | Meaning | Example |
|---|---|---|
| `__PROJECT__` | project/namespace, Helm release, chart and Kafka cluster name (DNS label) | `shop` |
| `__PROJECT_TITLE__` | project display name | `Shop reference architecture` |
| `__SERVICES__` | space-separated Maven modules built and deployed (lib.sh) | `orders billing gateway` |
| `__SERVICE__` | the first service in the chart's `services:` map; default canary/native target | `orders` |
| `__GIT_REPO_URL__` | git URL Argo CD renders the chart from | `https://github.com/<org>/<repo>.git` |

`__NAMESPACE__` in `platform/mesh/kiali.yaml` is **not** a scaffold marker:
`install-mesh.sh` fills it at apply time. Lowercase `__meta_*`/`__address__`
in the chart are Prometheus relabel syntax; leave them alone.

```bash
SKILL=<path to skills/lgtm-crc>; DEST=<repo>/openshift; P=shop
cp -r "$SKILL/templates/openshift" "$DEST"
mv "$DEST/helm/__PROJECT__" "$DEST/helm/$P"
grep -rl '__[A-Z_]*__' "$DEST" | xargs sed -i \
  -e "s/__PROJECT_TITLE__/Shop reference architecture/g" -e "s/__PROJECT__/$P/g" \
  -e "s/__SERVICES__/orders billing gateway/g" -e "s/__SERVICE__/orders/g" \
  -e "s|__GIT_REPO_URL__|https://github.com/<org>/<repo>.git|g"
chmod +x "$DEST"/*.sh "$DEST"/platform/*.sh
```

## Workflow

1. **Scope.** Ask (if not clear): project name; services (Maven modules) and
   which need Postgres, a Route, Kafka-lag scaling, extra JVM flags; which
   platform features (mesh, canary, keda, observability, ai, native,
   gitops); the git URL for GitOps. Drop scripts for features not wanted.
2. **Re-check versions upstream** before writing pins
   (`references/versions.md`): newest stable CSV per operator channel
   (`oc get packagemanifest`, needs the cluster), newest image tags
   (`skopeo list-tags`), newest UBI with the newest runtime. Update the
   Subscription YAML and the `*_CSV` variable together. If a newer CSV
   cannot be known without a cluster, say so and keep the dated pin.
3. **Scaffold** (`Placeholders` above). Fill the chart's `services:` map
   (keys = `SERVICES` in lib.sh, plus AI services with `ai: true`), set
   `route: true` on Route-facing services, move each Containerfile's JVM
   `-D` flags into `javaToolOptions`.
4. **Add the `openshift` Maven profile** to each service pom
   (`snippets/quarkus-openshift-profile.xml`). Nothing else in the poms or
   `application.properties` changes; keep the env contract (ConfigMap keys,
   Service and Secret names) identical to the other runtime.
5. **Validate offline:** `bash -n` every script; `helm lint` and
   `helm template` the chart with every flag on.
6. **Fill `project-checks.sh`** and the `TODO(__PROJECT__)` hooks in
   `platform/evidence.sh` with the project's own end-to-end checks.
7. **Hand off** the run order (only the user starts a cluster):
   ```bash
   minikube stop -p <profile>                  # one cluster at a time
   crc config set cpus 6; crc config set memory 20480   # 12 / 32768 for the platform tier
   crc start; eval "$(crc oc-env)"
   ./openshift/install-infra.sh && ./openshift/build-images.sh && ./openshift/deploy.sh
   ./openshift/platform/install-platform.sh    # optional
   ./openshift/capture-evidence.sh
   ./openshift/teardown.sh                     # always: clean, then crc stop
   ```
8. **Write the appendix chapter** if the project has a site (pair with
   `lgtm-tutorial`); record decisions and the "what broke" table from
   `references/known-issues.md`.

## Key principles (always apply)

- **CRC is dedicated to one project at a time and cleaned after each use.**
  Every session ends with `teardown.sh`: release, project, operands,
  Subscriptions, CSVs, InstallPlans, owned CRDs, operator namespaces, a
  leftover check, then `crc stop`. Before a run, inventory
  `oc get sub,csv -A` and non-system namespaces; flag anything foreign and
  remove it only with the user's approval. See `references/teardown.md`.

- **One cluster at a time.** Stop minikube (and any other local cluster)
  before `crc start`; `require_crc` refuses to run beside a running minikube
  profile. Stop CRC when idle. Stop, don't delete.

- **Fedora/RHEL only.** Host instructions target Fedora and RHEL (bare metal
  or VM with nested virtualisation). Do not write instructions for any other
  OS.

- **No host container engine needed; never mix runtimes.** Images build in
  the cluster. Any local image work or compose stack on the CRC path uses
  Docker Engine (`docker build -f Containerfile`, `docker compose`); never
  hand images between runtimes.

- **Never print secrets — print the command that retrieves them.** Scripts
  use the `crc-admin` context `crc start` writes and refuse any API server
  other than `api.crc.testing`. The kubeadmin password, tokens and the pull
  secret never appear in files, commits, evidence or chat; tell the user to
  run `crc console --credentials` themselves when they need the console
  login. Generated passwords are read into a variable, compared, unset.
  Evidence passes a secret scrub before it is kept.

- **Newest stable versions, checked upstream, pinned exactly.** Operators:
  the newest CSV in the newest stable channel
  (`oc get packagemanifest <pkg> -o jsonpath='{range .status.channels[*]}{.name} {.currentCSV}{"\n"}{end}'`),
  pinned with `startingCSV` and `installPlanApproval: Manual`; only the
  InstallPlan naming that CSV is approved. Istio pinned to an exact
  `vX.Y.Z` (never `-latest`). Images pinned to exact tags found with
  `skopeo list-tags`. Record deliberate holds with a reason.

- **Newest UBI with the newest runtime.** `ubi10/openjdk-25` (JDK 25),
  `ubi10/python-314-minimal` (Python 3.14); fall back to `ubi9` with the
  **same** runtime only if ubi10 lacks it. Never drop the runtime to stay
  on a newer UBI.

- **Routes, not NodePorts, port-forward or tunnels.** Edge TLS, HTTP
  redirected, `*.apps-crc.testing`. Verify with the cluster's ingress CA
  (`curl --cacert`), never `--insecure`. Reach internal Services with
  `oc exec` into a pod, by Service name.

- **restricted-v2 everywhere; no fixed UIDs.** Only `runAsNonRoot`,
  `allowPrivilegeEscalation: false`, drop ALL, `seccompProfile:
  RuntimeDefault`. The single exception is otel-lgtm under `anyuid` with
  only `runAsUser: 0`.

- **Custom resources go while their operator still runs.** Install order
  and the reverse teardown order are deliberate (finalizers).

- **Wait on proof, not time.** Package served before Subscription; CSV
  `Succeeded`; `oc rollout status` (not `condition=Available`); poll for
  side effects with `wait_for`. See `snippets/oc-waits.md`.

- **Record the gotchas.** Every fix in `references/known-issues.md` exists
  because a live run failed without it. Don't simplify one away.

## Reference files

Read as needed:

- `references/prerequisites-and-sizing.md` — host tools, one-cluster rule,
  dedicated-CRC inventory, `crc config` sizing (6/20 GiB core, 12/32 GiB
  platform, 80 GB disk), the crc-admin context and credential rules.
- `references/operators.md` — the pinning pattern, `install_operator`, the
  six operators with namespaces/OperatorGroups/channels, their operands.
- `references/image-builds.md` — binary S2I with quarkus-openshift (the four
  settings that matter), run-java.sh differences, the native Mandrel build
  and build-time `-J-D` properties.
- `references/chart-patterns.md` — restricted-v2, Routes, wait-for-postgres,
  ConfigMap checksum, lookup password, rollout status, immutable selectors.
- `references/platform-tier.md` — mesh, KEDA, OpenTelemetry + otel-lgtm,
  Ollama, native, GitOps recipes with their verification.
- `references/known-issues.md` — symptom/cause/fix table from the live runs.
- `references/versions.md` — the 2026-10-09 pin table and the re-check
  command for every entry.
- `references/teardown.md` — teardown order and why.

## Templates

`templates/openshift/` mirrors the scaffolded tree:

- `lib.sh` — `require_crc`, `require_single_cluster`, `require_crc_size`,
  `step/ok/warn/fail`, `wait_for`, `install_operator`,
  `refuse_foreign_subscription`, `helm_values_json`.
- `install-infra.sh`, `infra/amq-streams-subscription.yaml`, `infra/kafka.yaml`
- `build-images.sh`, `deploy.sh`, `capture-evidence.sh`, `project-checks.sh`,
  `teardown.sh`, `evidence/` (output directory)
- `helm/__PROJECT__/` — chart skeleton: `services:` map, Postgres, Routes,
  flags `mesh`, `keda`, `observability`, `ai`, `native`.
- `platform/` — `install-platform.sh`, `install-mesh.sh`, `install-keda.sh`,
  `install-observability.sh`, `install-ai.sh`, `build-native.sh`,
  `install-gitops.sh`, `evidence.sh`, `subscriptions/*.yaml`,
  `mesh/istio.yaml`, `mesh/kiali.yaml`, `keda/kedacontroller.yaml`,
  `native/Containerfile`.

## Snippets

- `snippets/quarkus-openshift-profile.xml` — the Maven profile.
- `snippets/restricted-v2-pod.yaml` — the securityContext, plus the anyuid exception.
- `snippets/route-edge-tls.yaml` — an edge Route with the health annotation.
- `snippets/argocd-application.yaml` — an Application that adopts a release.
- `snippets/secret-scrub.sh` — the evidence scrub as a function.
- `snippets/oc-waits.md` — what to wait on, and for how long.

## What this skill explicitly does NOT do

- It does not start, stop or modify a cluster on its own. Live runs are the
  user's call; the skill writes scripts and tells them the order.
- It does not install `crc`, `oc`, `helm` or Maven, and never downloads or
  handles the pull secret.
- It does not target production OpenShift: single-node CRC sizing,
  anonymous Kiali, one-replica Kafka and Postgres.
- It does not cover OpenShift's user-workload monitoring or Tekton.
- For minikube use `lgtm-minikube-stack`; for compose use
  `lgtm-docker-stack` (`lgtm-podman-stack` for podman users); for the Quarkus project itself
  use `lgtm-quarkus`.

## Multi-step work → `lgtm-relay`

Scaffolding a full CRC appendix is multi-file work: route it through
`lgtm-relay` (Opus plans the feature set and pins, Sonnet writes the
scripts, Opus validates with `bash -n`, `helm lint`/`helm template` and,
when the user runs it, the evidence). Restate the key principles above in
each executor prompt; subagents do not inherit loaded skills. Operator
installs share one cluster and must be sequenced, never parallel.
