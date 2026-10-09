# Teardown

The CRC is dedicated to one project at a time and is returned to clean after
**every** use: `./openshift/teardown.sh` removes everything the scripts
installed, then runs `crc stop`. `--keep-running` skips the stop (for a
clean re-run). Stop, don't `crc delete`.

## Order (and why)

Custom resources are deleted while their operator still runs; otherwise
their finalizers wait forever on an operator that is gone.

1. **Argo CD Application** first. Its `resources-finalizer` prunes what Argo
   CD manages, and self-heal would otherwise re-create everything deleted
   next.
2. **Helm release** (`helm uninstall --wait`), while KEDA and OpenTelemetry
   can still clear their finalizers on ScaledObjects and Instrumentations.
3. **KafkaTopics/KafkaUsers, then Kafka + KafkaNodePool**, while AMQ Streams
   runs; wait for the broker pods to go. (A KafkaTopic left behind keeps a
   `strimzi.io/topic-operator` finalizer and hangs the namespace.)
4. **The project** (`oc delete project`), which takes builds, BuildConfigs,
   ImageStreams and PVCs with it.
5. **Control planes:** Kiali, Istio, IstioCNI, KedaController. Then the
   **default Argo CD instance**: patch the GitOps Subscription with
   `spec.config.env: [{name: DISABLE_DEFAULT_ARGOCD_INSTANCE, value: "true"}]`
   and wait until the operator has removed `argocd/openshift-gitops` itself.
   Deleting it directly makes the operator re-create it; removing the
   operator first strands its finalizer.
6. **Operators**, in reverse install order. For each: read
   `.status.installedCSV` from the Subscription, read the CSV's
   `.spec.customresourcedefinitions.owned[*].name` **before** deleting it,
   then delete the Subscription, the CSV, the InstallPlans that name it, and
   those CRDs.
7. **Leftover CRDs no CSV owns** (Istio's, created by the Sail operator):
   anything matching `\.(istio\.io|strimzi\.io|sailoperator\.io|kiali\.io|keda\.sh|opentelemetry\.io|argoproj\.io)$`.
8. **Operator namespaces:** `openshift-gitops`, `openshift-gitops-operator`,
   `openshift-opentelemetry-operator`, `openshift-keda`, `istio-system`,
   `istio-cni`.
9. **Leftover check:** any Subscription, non-`packageserver` CSV,
   non-system namespace or platform CRD still present is printed. If it
   belongs to another project, flag it; remove it only with the user's
   approval.
10. `crc stop` (unless `--keep-running`).

## Measured

From the full platform tier: 213 s with `--keep-running`, 266 s including
`crc stop`. From the core only: 46 s.

## Adapting

- Drop entries from `OPERATORS` / `OPERATOR_NAMESPACES` only if the project
  never installs them; missing ones are skipped anyway.
- Add any new operator to all three lists (operators, namespaces, CRD
  pattern) when the project adds one.
- Never `oc patch ... finalizers: []` as a routine step. If a finalizer is
  stuck, find which operator owns it and why it is gone; clearing it by hand
  is a last resort and is reported.
