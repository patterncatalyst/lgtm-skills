# Operators (OLM)

Every operator comes from the `redhat-operators` catalog through a pinned
Subscription and one helper, `install_operator` in `lib.sh`.

## The pinning pattern

```yaml
spec:
  name: <package>
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  channel: <channel>
  startingCSV: <exact CSV>
  installPlanApproval: Manual
```

`install_operator <manifest> <ns> <package> <csv>`:

1. waits until the catalog actually serves the package (just after
   `crc start`, `redhat-operators` reports READY with zero packages for about
   a minute, so waiting on the CatalogSource status is not enough);
2. applies the manifest (Namespace + OperatorGroup when the operator does
   not live in `openshift-operators`, then the Subscription);
3. approves **only** the InstallPlan whose `clusterServiceVersionNames`
   contains the pinned CSV;
4. waits for the CSV to reach `Succeeded`.

Later InstallPlans (upgrades OLM proposes) stay unapproved, so a version
moves only when someone edits the pin. Never `Automatic`.

## Choosing the pin: newest stable CSV, checked on the cluster

Before each use, read what the catalog offers now and pin the newest CSV of
the newest stable channel:

```bash
pkg=servicemeshoperator3
oc get packagemanifest "$pkg" -n openshift-marketplace \
  -o jsonpath='{.status.defaultChannel}{"\n"}{range .status.channels[*]}{.name}{"  "}{.currentCSV}{"\n"}{end}'
```

There is no reliable way to know the newest CSV without a cluster: the
catalog image is what defines it. Re-check on the cluster with
`oc get packagemanifest` and update both the Subscription YAML
(`channel`, `startingCSV`) and the `*_CSV` variable in the script.

## The operators

| Operator | Package | Namespace | OperatorGroup | Channel / CSV (2026-10-09) |
|---|---|---|---|---|
| AMQ Streams (Kafka) | `amq-streams` | `openshift-operators` | global (default) | `amq-streams-3.2.x` / `amqstreams.v3.2.1-14` |
| OpenShift Service Mesh 3 | `servicemeshoperator3` | `openshift-operators` | global | `stable-3.4` / `servicemeshoperator3.v3.4.3` |
| Kiali | `kiali-ossm` | `openshift-operators` | global | `stable` / `kiali-operator.v2.27.5` |
| Custom Metrics Autoscaler | `openshift-custom-metrics-autoscaler-operator` | `openshift-keda` | own namespace (`targetNamespaces: [openshift-keda]`) | `stable` / `custom-metrics-autoscaler.v2.19.0-4` |
| Red Hat build of OpenTelemetry | `opentelemetry-product` | `openshift-opentelemetry-operator` | all namespaces | `stable` / `opentelemetry-operator.v0.158.0-2` |
| OpenShift GitOps | `openshift-gitops-operator` | `openshift-gitops-operator` | all namespaces | `gitops-1.22` / `openshift-gitops-operator.v1.22.1` |

Templates: `templates/openshift/infra/amq-streams-subscription.yaml` and
`templates/openshift/platform/subscriptions/*.yaml`.

## Operands each operator needs

| Operator | Operand CR | Template |
|---|---|---|
| AMQ Streams | `Kafka` + `KafkaNodePool` (`kafka.strimzi.io/v1`) | `infra/kafka.yaml` |
| OSSM 3 | `IstioCNI` + `Istio` (`sailoperator.io/v1`), version pinned | `platform/mesh/istio.yaml` |
| Kiali | `Kiali` (`kiali.io/v1alpha1`) | `platform/mesh/kiali.yaml` |
| CMA | `KedaController` (`keda.sh/v1alpha1`) in `openshift-keda` | `platform/keda/kedacontroller.yaml` |
| OpenTelemetry | `Instrumentation` per project (in the chart) | chart `observability.yaml` |
| GitOps | default `ArgoCD` instance `openshift-gitops` (created by the operator) + an `Application` | `platform/install-gitops.sh` |

## Shared-cluster guard

`refuse_foreign_subscription <pkg> <ns>/<name> <csv>` fails when a
Subscription for the same package exists under another name or CSV: that
is another project's leftover, and the CRC is dedicated to one project at a
time. Report it; do not adopt or overwrite it.
