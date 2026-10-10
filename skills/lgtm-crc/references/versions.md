# Versions

**Rule: newest stable, checked upstream, pinned exactly.** At the start of
work (and before every live run), check each component for its newest
stable release (no rc/beta/alpha/tech-preview), pin the exact version, and
record any deliberate hold with its reason. Never a floating tag
(`latest`, `v1.30-latest`), never `installPlanApproval: Automatic`.

The pins below were current as of **2026-10-09**, the date of the verified
CRC run. They are a starting point, not a promise: re-check with the
commands in the last column. Operator CSVs cannot be known without a
cluster (the catalog image defines them): re-check on the cluster with
`oc get packagemanifest`.

## Cluster

| Component | Pinned | Re-check |
|---|---|---|
| OpenShift Local (`crc`) | 2.64.0 | `crc version`; `gh release list -R crc-org/crc --limit 5` |
| OpenShift | 4.22.14 (bundled with crc 2.64.0) | `crc version`; `oc version` |
| Kubernetes | 1.35.6 | `oc version` |

## Operators (redhat-operators catalog)

| Operator | Package | Channel | CSV |
|---|---|---|---|
| AMQ Streams | `amq-streams` | `amq-streams-3.2.x` | `amqstreams.v3.2.1-14` |
| OpenShift Service Mesh 3 | `servicemeshoperator3` | `stable-3.4` | `servicemeshoperator3.v3.4.3` |
| Kiali | `kiali-ossm` | `stable` | `kiali-operator.v2.27.5` |
| Custom Metrics Autoscaler | `openshift-custom-metrics-autoscaler-operator` | `stable` | `custom-metrics-autoscaler.v2.19.0-4` |
| Red Hat build of OpenTelemetry | `opentelemetry-product` | `stable` | `opentelemetry-operator.v0.158.0-2` |
| OpenShift GitOps | `openshift-gitops-operator` | `gitops-1.22` | `openshift-gitops-operator.v1.22.1` |

Re-check (each package; take the newest stable channel's `currentCSV`):

```bash
for pkg in amq-streams servicemeshoperator3 kiali-ossm \
           openshift-custom-metrics-autoscaler-operator opentelemetry-product \
           openshift-gitops-operator; do
  printf '%s (default %s)\n' "$pkg" \
    "$(oc get packagemanifest "$pkg" -n openshift-marketplace -o jsonpath='{.status.defaultChannel}')"
  oc get packagemanifest "$pkg" -n openshift-marketplace \
    -o jsonpath='{range .status.channels[*]}{"  "}{.name}{"  "}{.currentCSV}{"\n"}{end}'
done
```

Update the Subscription YAML (`channel`, `startingCSV`) and the matching
`*_CSV` variable in the script together.

## Operands

| Component | Pinned | Re-check |
|---|---|---|
| Istio (OSSM 3 `Istio`/`IstioCNI` `spec.version`) | v1.30.5 (OSSM 3.4.3 offers v1.26-v1.30) | `oc get crd istios.sailoperator.io -o json \| jq -r '.. \| .version? \| .enum? // empty \| .[]' \| sort -uV \| tail` |
| Kafka (in the `Kafka` CR) | 4.2.0, `metadataVersion: 4.2-IV1` | versions the installed AMQ Streams supports: its release notes / `oc get csv amqstreams.* -o yaml` (AMQ Streams 3.2 ships 4.1 and 4.2) |

## Images

| Image | Pinned | Re-check |
|---|---|---|
| JVM S2I builder | `registry.access.redhat.com/ubi10/openjdk-25:1.24-15` | `skopeo list-tags docker://registry.access.redhat.com/ubi10/openjdk-25` |
| Postgres | `registry.redhat.io/rhel10/postgresql-16:10.2-1791491499` | `skopeo list-tags docker://registry.redhat.io/rhel10/postgresql-16` (needs `skopeo login registry.redhat.io`); also look for a newer `rhel10/postgresql-NN` |
| Mandrel builder | `quay.io/quarkus/ubi10-quarkus-mandrel-builder-image:jdk-25.0.4.1` | `skopeo list-tags docker://quay.io/quarkus/ubi10-quarkus-mandrel-builder-image`; match `native-sources/graalvm.version` |
| Native runtime | `quay.io/quarkus/ubi10-quarkus-micro-image:2.0-2026-10-04` | `skopeo list-tags docker://quay.io/quarkus/ubi10-quarkus-micro-image` |
| otel-lgtm | `docker.io/grafana/otel-lgtm:0.36.0` | `skopeo list-tags docker://docker.io/grafana/otel-lgtm` |
| Ollama | `docker.io/ollama/ollama:0.35.1` | `gh release list -R ollama/ollama --limit 5` |
| Model | `qwen2.5:3b` | project choice; size it to the 4-6 GiB Ollama limit |

## Toolchain

| Tool | Pinned | Note |
|---|---|---|
| JDK | 25 | SDKMAN (`lgtm-quarkus`) |
| Maven | 3.9 | |
| Quarkus | 3.40.1 (LTS) | `quarkus.openshift.version` verified on 3.39.5; `quarkus.openshift.namespace` needed on 3.40 |

## UBI selection

Newest UBI major with the newest runtime: `ubi10/openjdk-25` (JDK 25),
`ubi10/python-314-minimal` (Python 3.14). If the newest major does not
publish that runtime, fall back to the older major with the **same**
runtime (`ubi9/openjdk-25`, `ubi9/python-314`). Never drop the runtime
version to stay on a newer UBI. Confirm with `skopeo inspect` before
pinning.
