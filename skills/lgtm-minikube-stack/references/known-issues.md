# Known issues

The gotchas that cost real time to discover the hard way. Each one has a
symptom (what you see), a cause (what's actually happening), and a fix or
mitigation. Read this when something breaks; the symptoms here repeat across
projects.

## Issue 0 — `kubectl port-forward` drops under load or on idle (RESOLVED)

**Symptom.** Port-forward connections to Grafana, Loki, or other services
silently drop after minutes of idle time or under sustained request load.
The service appears down from the host but is healthy inside the cluster.

**Cause.** `kubectl port-forward` creates a single TCP connection through
the API server. The API server's keep-alive and timeout behavior causes
connections to drop, especially on minikube where the control plane is
resource-constrained.

**Fix.** Publish NodePorts to the host at cluster creation. All services
that need host access are defined with `type: NodePort` and fixed port
allocations, and `setup-profile.sh` passes them to
`minikube start --ports=127.0.0.1:<np>:<np>,...` so `127.0.0.1:<nodePort>` reaches the
service directly. An earlier fix used SSH tunnels to the minikube VM; those were
also dropped because the tunnel processes disconnect mid-session. Do not use
`kubectl port-forward`, SSH tunnels, or `minikube tunnel`. Published ports are
fixed at profile creation: adding a NodePort means recreating the profile. See
`references/ports-and-endpoints.md` for the allocation map and `--ports` list.

## Issue 1 — Job pods hang at `1/2 running` forever (mesh + Job conflict)

**Symptom.** A Job (an ingestion job, a `helm test`, a migration runner)
reaches `1/2 running` and never completes. Logs of the application container
show it finished successfully; the pod just won't terminate.

**Cause.** Istio sidecars don't know how to exit when the application
container completes. The Job stays in Running because the sidecar is still
Running. With namespace-wide injection enabled, every Job in the namespace
hits this.

**Fix.** Per-Job opt-out:
```yaml
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

Or, more durably: don't enable namespace-wide injection. Inject per Deployment
explicitly with the same annotation set to `true`. The bootstrap leaves
auto-injection OFF by default for exactly this reason.

## Issue 2 — Managed database won't bootstrap (mesh + TLS conflict)

**Symptom.** CloudNativePG's Postgres cluster won't reach Ready. Cluster pod
logs show TLS handshake failures between the primary and the operator's
healthcheck.

**Cause.** The Postgres pods have their own internal TLS (operator-managed),
and the injected sidecar's mTLS wrapping collides with it. The operator can't
talk to its own database through the sidecar.

**Fix.** Opt the Postgres namespace out of mesh injection entirely. The
bootstrap does NOT label namespaces for auto-injection, which keeps this
case working by default.

## Issue 3 — Native sidecars in Istio 1.29+

**Symptom.** A check like "is this pod meshed?" that inspects
`.spec.containers` returns the wrong answer. The pod is meshed but the check
says it isn't.

**Cause.** Istio 1.29+ on Kubernetes 1.29+ uses native sidecars: `istio-proxy`
is an `initContainer` with `restartPolicy: Always`, not a regular container.
It still counts toward the pod's `READY` count (`2/2`), so the only way to
tell from inspection is to look at `.spec.initContainers`.

**Fix.** Look at both:
```bash
kubectl get pod my-pod -o jsonpath='{.spec.initContainers[*].name},{.spec.containers[*].name}'
```

## Issue 4 — Service-to-pod traffic stops working, pod-to-pod still works

**Symptom.** Curl from one pod to another by Service ClusterIP times out
after several days of cluster uptime. Direct pod IP works.

**Cause.** Long-lived minikube nodes can lose kube-proxy's `/dev` mounts
(specifically `/dev/shm`), and kube-proxy then can't update its iptables
rules. The Service's ClusterIP routing breaks, but the pods themselves are
still healthy.

**Fix.** Cycle the node:
```bash
minikube stop -p <profile>
minikube start -p <profile>
```

Or restart kube-proxy alone:
```bash
kubectl delete pod -n kube-system -l k8s-app=kube-proxy
```

Prevention: don't run long-lived minikube nodes for tutorial work. Replace
the profile every few weeks of active use.

## Issue 5 — KEDA HTTP add-on v0.14.0 panic (fixed in v0.15.0)

**Symptom.** With KEDA HTTP add-on v0.14.0 and an `InterceptorRoute`-routed
POST request, the interceptor returns HTTP 504 and its logs show:
```
http: panic serving 127.0.0.1:XXXXX: invalid concurrent Body.Read call
```

**Cause.** The interceptor's reverse-proxy path with `EnableFullDuplex` doesn't
close the request body on RoundTrip failure (e.g. cold-start connection
refused). Go's HTTP server then panics on the next keep-alive peek
(golang/go#68560). Issue [kedacore/http-add-on#1668](https://github.com/kedacore/http-add-on/issues/1668);
fix in PR [#1669](https://github.com/kedacore/http-add-on/pull/1669), merged
to `main` and shipped in **v0.15.0** (there is no 0.14.1 binary).

**Fix.** Use v0.15.0 or newer. The setup script pins 0.16.0
(`KEDA_HTTP_VERSION` in `setup-keda.sh`). Do not go back to 0.14.0.

**Upgrading from 0.12.x** (what changes in the chart and behavior):

- `interceptor.replicas.waitTimeout` is replaced by `interceptor.readinessTimeout`
  (the old key is only a deprecated fallback in 0.16.0). `setup-keda.sh` sets
  `interceptor.readinessTimeout=180s`.
- Default timeouts changed in 0.14: request timeout disabled, response-header
  timeout 300s (was 500ms), readiness timeout disabled (was 20s). Timeout errors
  now return **504** (were 502); update any smoke test that asserts 502.
- `HTTPScaledObject` is still supported; upstream deprecates it in favor of
  `InterceptorRoute`.
- Interceptor metrics were renamed (`interceptor_requests_total` ->
  `interceptor_request_count_total`, `interceptor_pending_requests` ->
  `interceptor_request_concurrency`, `path`/`host` -> `route_name`/`route_namespace`);
  update dashboards.

## Issue 6 — `CreateContainerConfigError` means a secret/configmap reference is wrong

**Symptom.** A pod fails to start with `CreateContainerConfigError` and the
pod's events show "couldn't find key XYZ in secret some-name".

**Cause.** The container's pod spec references a key in a secret/configmap
that doesn't exist or doesn't contain that key. The application hasn't even
been started yet — kubelet can't render the pod spec into a runnable form.

**Fix.** Look at the pod's `.spec.containers[].env` and `.spec.containers[].envFrom`
for secret/configmap references; verify each one exists and contains the
expected keys. The application logs won't help; this error is upstream of
the application.

Particularly common with OpenMetadata's chart — see the openmetadata-specific
notes below.

## Issue 7 — OpenMetadata helm chart secret-name collisions

**Symptom.** OpenMetadata pod fails with `CreateContainerConfigError` even
though the user-supplied secrets exist.

**Cause.** The OpenMetadata chart looks for chart-generated secret names; if
the user-supplied secret has the same name, the chart's template logic
expects the chart-generated structure but gets the user's structure. Or the
chart references `airflow-secrets` even when Airflow is disabled, and the
placeholder needs to exist anyway.

**Fix.** Read the chart's `_helpers.tpl` and the templates that reference
secrets; either let the chart generate its own secrets (don't override) or
create empty placeholders for the ones the chart references unconditionally.

## Issue 8 — `to_regclass` queries return NULL even when the table exists

**Symptom.** A psql query like `SELECT to_regclass('schema.table')` returns
NULL, but the table is definitely there.

**Cause.** psql connected to the wrong database (the default `postgres` DB
instead of the application's DB). `to_regclass` is database-scoped; without
`-d <dbname>` the query runs against the wrong database.

**Fix.** Always pass `-d <dbname>` to psql when verifying table existence:
```bash
kubectl exec -n <ns> some-postgres-pod -- psql -d app_db -c "SELECT to_regclass('public.orders');"
```

## Issue 9 — Apicurio data lost on pod restart

**Symptom.** Schemas previously registered in Apicurio disappear after a pod
restart.

**Cause.** The dev-scale install uses in-memory storage (the default for the
3.x image when no `APICURIO_STORAGE_KIND` env is set). This is by design for
development; producers re-register schemas on startup, which keeps the
contract live but loses the audit trail.

**Fix.** For persistence, set `APICURIO_STORAGE_KIND=sql` with a datasource
pointing at Postgres. Production deployments use this; the dev-scale install
deliberately doesn't.

## Issue — `--ports` without a host IP binds 0.0.0.0

**Symptom.** `ss -ltn` shows the published NodePorts listening on `0.0.0.0` and `[::]`. Grafana (admin/admin), the registry and app endpoints answer from other machines on the network.

**Cause.** `minikube start --ports=30080:30080` passes the mapping to the container runtime with no host IP, which binds every interface.

**Fix.** Publish with a loopback host IP: `--ports=127.0.0.1:30080:30080,...`. `setup-profile.sh` builds the list that way and refuses to reuse a profile whose ports are not bound to 127.0.0.1; recreate it with `--replace`. Check with `docker inspect -f '{{json .HostConfig.PortBindings}}' <profile>` (`HostIp` must be `127.0.0.1`).
