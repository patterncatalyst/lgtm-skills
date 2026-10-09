# Helm chart patterns for OpenShift

The skeleton is `templates/openshift/helm/__PROJECT__/`. One data-driven
`services:` map renders every service; each platform feature is a flag that
defaults to `false`, so the core renders the same with or without them.

## restricted-v2: let OpenShift pick the UID

`restricted-v2` (the default SCC) rejects a pod that asks for a UID outside
the namespace's range. Never set `runAsUser`, `runAsGroup` or `fsGroup`;
set only what restricted-v2 requires (`chart.containerSecurity`):

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

Images must tolerate an arbitrary UID with GID 0: the UBI OpenJDK images,
the sclorg `rhel10/postgresql-16` image, Apicurio and Ollama (with `HOME` on
a writable volume) do. Verify with the SCC annotation and the UID:

```bash
oc get pods -n <ns> -o custom-columns='POD:.metadata.name,SCC:.metadata.annotations.openshift\.io/scc,UID:.spec.containers[0].securityContext.runAsUser'
oc get ns <ns> -o jsonpath='{.metadata.annotations.openshift\.io/sa\.scc\.uid-range}'
```

The one documented exception is `otel-lgtm` (see `platform-tier.md`).

## Routes, not NodePorts, port-forward or tunnels

Host access goes through the router: an edge-TLS Route with HTTP redirected
(`insecureEdgeTerminationPolicy: Redirect`), host
`<route>-<namespace>.apps-crc.testing`. Set `route: true` on a service.
Each Route carries a `health-check-path` annotation that
`capture-evidence.sh` probes. Verify with the cluster's ingress CA, never
`--insecure`:

```bash
oc get configmap default-ingress-cert -n openshift-config-managed \
    -o jsonpath='{.data.ca-bundle\.crt}' > /tmp/ingress-ca.crt
curl --cacert /tmp/ingress-ca.crt https://<route>-<ns>.apps-crc.testing/q/health/ready
```

Services without a Route are exercised with `oc exec` into their own pod
(`in_pod` in capture-evidence.sh).

## wait-for-postgres init container

Hibernate connects at boot; without a gate the DB services restart once or
twice while Postgres initialises. `db: true` adds an init container that
reuses the service's JVM image (bash's `/dev/tcp`), so nothing extra is
pulled:

```yaml
command: ["bash", "-c", "until (exec 3<>/dev/tcp/<release>-postgres-rw/5432) 2>/dev/null; do sleep 2; done"]
```

With the mesh on, the native `istio-proxy` sidecar starts first, so this
check already goes through the proxy.

## ConfigMap checksum

Env from a ConfigMap is read at pod start; changing it does not restart
pods. The pod template carries
`checksum/config: {{ include (print $.Template.BasePath "/config.yaml") $ | sha256sum }}`.
Keep the generated Secret out of `config.yaml` (it lives in `secret.yaml`):
under `helm template` (Argo CD) the Secret re-renders randomly and would
change the checksum on every render.

## Generated password via lookup

The Postgres password is generated once (`randAlphaNum 24`) and kept on
upgrades with `lookup`. It never appears in `values.yaml`, a file, the
evidence or chat. Under Argo CD, `lookup` returns nothing; see the GitOps
section of `platform-tier.md`.

## Wait with rollout status

`deploy.sh` runs `oc rollout status` per StatefulSet and Deployment.
`oc wait --for=condition=Available` is not enough: on an upgrade the old
ReplicaSet stays Available until the new pods are Ready, so the wait passes
before the new version runs.

## Values kept across scripts

`deploy.sh` uses `helm upgrade --install --reset-then-reuse-values`, so each
platform script can switch on one flag (`--set mesh.enabled=true`) without
repeating the others.

## Immutable selectors

A Deployment's selector is immutable. The chart selects only on
`app.kubernetes.io/name`; turning the mesh on later only adds pod labels
(`istio.io/rev`, `version`). Adding `version` to the selector would make
`helm upgrade` fail when the mesh is enabled on a running release.

## Replicas and autoscaling

When a ScaledObject targets a Deployment, the chart omits `replicas`, so
Helm and the HPA KEDA creates do not fight over it.
