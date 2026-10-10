# Known issues

Rows 1-20 cost time on a live CRC run (OpenShift Local 2.64.0,
OpenShift 4.22.14, 2026-10-09); 21-22 are guards carried over or designed in; 23 was found on the Quarkus 3.40 run. Symptom, cause, fix. The templates already
contain every fix; this file explains why, so a fix is not "simplified" away.

| # | Symptom | Cause | Fix (in the templates) |
|---|---|---|---|
| 1 | Maven succeeds in seconds and no image appears | `quarkus-container-image-openshift` alone generates no BuildConfig ("No OpenShift manifests were generated") | Use `quarkus-openshift` in the `openshift` profile |
| 2 | ImageStream tag is `1.0.0-SNAPSHOT`, not `v1` | The S2I output tag follows `quarkus.openshift.version`; `quarkus.container-image.tag` alone is ignored for it | `-Dquarkus.openshift.version=$IMAGE_TAG` (build-images.sh) |
| 3 | Heap at 80% of the limit; OOMKilled under load | The S2I image's `run-java.sh` reads `JAVA_MAX_MEM_RATIO`; `JAVA_MAX_RAM_RATIO` is ignored | `JAVA_MAX_MEM_RATIO: "50"` in the ConfigMap |
| 4 | JVM `-D` flags from the Containerfile missing | `run-java.sh` starts the app; the project Containerfile is not used | `services.<svc>.javaToolOptions` → `JAVA_TOOL_OPTIONS` |
| 5 | DB services restart once or twice on install | Hibernate connects at boot, before Postgres accepts connections | `wait-for-postgres` init container (bash `/dev/tcp`, same image) |
| 6 | A ConfigMap change does not reach running pods | Env from a ConfigMap is read at pod start | `checksum/config` annotation over `config.yaml` (ConfigMap only) |
| 7 | `deploy.sh` reports success while new pods are still starting | `condition=Available` is satisfied by the old ReplicaSet during an upgrade | `oc rollout status` per Deployment/StatefulSet |
| 8 | Deprecation warnings on every Kafka apply | AMQ Streams 3.2 deprecates `kafka.strimzi.io/v1beta2` | CRs on `kafka.strimzi.io/v1`; drop the node-pools/kraft annotations |
| 9 | `install_operator` times out right after `crc start` | `redhat-operators` reports READY but serves no packages for about a minute | Wait for `oc get packagemanifest <pkg>`, not the CatalogSource |
| 10 | Pod rejected: UID not in range | A fixed `runAsUser` (e.g. 185, 1001) is outside the namespace range under restricted-v2 | Never set `runAsUser`; only the restricted-v2 securityContext |
| 11 | ScaledObject `Ready=False`, `no such host` | KEDA runs in `openshift-keda`; the short Kafka Service name does not resolve there | FQDN `bootstrapServers` (`<cluster>-kafka-bootstrap.<ns>.svc.cluster.local:9092`) |
| 12 | Every Route request returns 502 after the mesh is enabled | The router is not in the mesh and sends plaintext; STRICT rejects it | PERMISSIVE PeerAuthentication for each Route-facing service |
| 13 | A curl to a pod IP is reset under STRICT, even from a meshed pod | A pod-IP call leaves the client sidecar as plaintext, and the target is STRICT | Call the Service name |
| 14 | Kiali graph empty | No Prometheus on OpenShift Local | otel-lgtm's Prometheus scrapes sidecars on :15020; Kiali points at it |
| 15 | Pods from the same upgrade lack the Java agent | Helm creates Deployments before the Instrumentation CR; the webhook missed them | install-observability.sh restarts annotated pods without the agent init container |
| 16 | otel-lgtm lands on restricted-v2 and Grafana cannot write `/data` | anyuid allows no seccomp profile; adding one makes SCC admission pick restricted-v2 | securityContext with **only** `runAsUser: 0`, ServiceAccount bound to anyuid |
| 17 | Native service: `SecurityException: Forbidden <class>` on every Kafka send (Avro) | Avro's `ClassSecurityValidator` reads `org.apache.avro.SERIALIZABLE_PACKAGES` in a static initializer that runs during native-image's build; a runtime `-D` arrives too late | `NATIVE_BUILD_ARGS='-J-D...'` → `-Dquarkus.native.additional-build-args`; the script checks `native-image.args` |
| 18 | Postgres password replaced on every Argo CD sync (avoided) | `lookup` returns nothing under `helm template` | `ignoreDifferences` on `/data/password` + `RespectIgnoreDifferences=true` |
| 19 | Teardown hangs: `openshift-gitops` namespace / ArgoCD stuck on a finalizer | The GitOps operator re-creates its default instance when it is deleted, and removing the operator first strands the instance's finalizer | Patch the Subscription with env `DISABLE_DEFAULT_ARGOCD_INSTANCE=true` and wait for the operator to remove the instance, before removing the operator |
| 20 | Project stuck in `Terminating` | KafkaTopic `strimzi.io/topic-operator` finalizer with the operator already gone | Delete KafkaTopics/KafkaUsers and the Kafka CR while AMQ Streams runs, then the project |
| 21 | (from the minikube path) A meshed Job never completes (1/2) | The sidecar keeps running after the job container exits | Do not label Jobs with `istio.io/rev` (the model-pull Job is unmeshed) |
| 22 | (design guard) `helm upgrade` would fail when the mesh is turned on | A Deployment selector is immutable | Select only on `app.kubernetes.io/name`; `version` is a pod label only |
| 23 | In-cluster Quarkus build lands in `default` | Quarkus 3.40 ignores `quarkus.kubernetes-client.namespace` and `KUBERNETES_NAMESPACE` for the openshift build, and `crc start` resets the context namespace to `default` | Pass `-Dquarkus.openshift.namespace=<ns>` (`build-images.sh` does) |

## Not covered

OpenShift's own monitoring stack (user-workload monitoring), Tekton
pipelines, and multi-node behaviour were not exercised.
