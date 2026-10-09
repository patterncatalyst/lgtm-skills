# Readiness waits on OpenShift

Wait on the thing that proves readiness, with a timeout, and fail with the
command that diagnoses it.

| What | Wait | Timeout |
|---|---|---|
| Operator package served | `oc get packagemanifest <pkg> -n openshift-marketplace` (poll) | 300 s |
| InstallPlan proposed | poll for an InstallPlan naming the CSV | 300 s |
| CSV installed | `.status.phase == Succeeded` (poll) | 600 s |
| Kafka | `oc wait kafka/<name> --for=condition=Ready` | 900 s |
| Istio / IstioCNI | `oc wait istio/default --for=condition=Ready` | 600 / 300 s |
| Deployment / StatefulSet | `oc rollout status <kind>/<name>` (not `condition=Available`) | 300-600 s |
| Operator-created Deployment | poll `oc get deployment <name>` until it exists, then `rollout status` | 300-600 s |
| ScaledObject | `oc wait scaledobject/<name> --for=condition=Ready` | 120 s |
| Job | `oc wait job/<name> --for=condition=Complete` | 1200 s (model pull) |
| Argo CD Application | `.status.sync.status/.status.health.status == Synced/Healthy` (poll) | 900 s |
| Namespace deleted | poll until `oc get namespace <ns>` fails | 300-600 s |

Label-selector gotcha: `oc get pod -l x=y -o name` exits 0 with no matches,
so test for empty output, not the exit code.

Event-driven checks (a row written, a message consumed) poll for the side
effect with `wait_for`, never a fixed `sleep`.
