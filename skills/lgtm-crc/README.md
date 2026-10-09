# lgtm-crc

A project's OpenShift Local (CRC) path in one `openshift/` directory: pinned
Red Hat operators, images built inside the cluster, a Helm chart that runs
under `restricted-v2` with edge-TLS Routes, an opt-in platform tier, evidence
capture with a secret scrub, and a teardown that leaves the CRC empty and
stopped.

## What you get

| Piece | Role | Opt-in |
|---|---|---|
| `lib.sh` | `require_crc` (crc-admin context, refuses other clusters), `install_operator` (Manual approval, startingCSV), waits | always |
| `install-infra.sh` | project + AMQ Streams + one-node KRaft Kafka (`kafka.strimzi.io/v1`) | `ENABLE_KAFKA` |
| `build-images.sh` | binary S2I builds via quarkus-openshift on `ubi10/openjdk-25` | always |
| `helm/<project>/` | services map, Postgres (lookup password), Routes, platform flags | per flag |
| `deploy.sh` | `helm upgrade --install --reset-then-reuse-values` + `oc rollout status` | always |
| `platform/install-mesh.sh` | OSSM 3 (Istio v1.30.5) + Kiali, STRICT mTLS, canary | `mesh.enabled` |
| `platform/install-keda.sh` | Custom Metrics Autoscaler, Kafka-lag ScaledObjects | `keda.enabled` |
| `platform/install-observability.sh` | OpenTelemetry Java-agent injection + otel-lgtm + Grafana Route | `observability.enabled` |
| `platform/install-ai.sh` | Ollama under restricted-v2 + model Job + AI services | `ai.enabled` |
| `platform/build-native.sh` | Mandrel native build in the cluster | `native.enabled` |
| `platform/install-gitops.sh` | OpenShift GitOps Application adopting the release | Application |
| `capture-evidence.sh` | builds, SCCs, Routes, project checks, platform checks, secret scrub | always |
| `teardown.sh` | everything above removed in finalizer-safe order, then `crc stop` | always |

## Run order

```bash
minikube stop -p <profile>                     # one cluster at a time
crc config set cpus 6 && crc config set memory 20480 && crc config set disk-size 80
crc setup && crc start && eval "$(crc oc-env)"

./openshift/install-infra.sh
./openshift/build-images.sh
./openshift/deploy.sh
./openshift/platform/install-platform.sh       # optional; needs 12 vCPU / 32 GiB
./openshift/capture-evidence.sh
./openshift/teardown.sh                        # always, at the end of every session
```

## Verified configuration

- Fedora host; OpenShift Local 2.64.0, OpenShift 4.22.14, Kubernetes 1.35.6.
- Core at 6 vCPU / 20 GiB: install-infra 50 s, build-images (7 services)
  ~180 s, deploy 33 s, evidence 13 s, teardown 46 s; zero restarts.
- Platform tier at 12 vCPU / 32 GiB: install-platform 837 s, evidence
  418 s (mostly KEDA cooldown), teardown with `crc stop` 266 s, leaving
  no Subscription, CSV, platform CRD or non-system namespace.
- Versions as of 2026-10-09 in `references/versions.md`; re-check before use.
