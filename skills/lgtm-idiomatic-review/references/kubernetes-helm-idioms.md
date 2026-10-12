# Kubernetes / Helm / kustomize / OpenShift idioms

Idiomatic manifests for example and tutorial code. Authority:
`lgtm-minikube-stack` (generic upstream Kubernetes), `lgtm-crc` (OpenShift
Local), `lgtm-docker-stack` (compose, for contrast), and the Kubernetes and Helm
docs. Severity tiers match the SKILL: **reinvented** > **deprecated** >
**structure** > **style**.

The guiding rule: declare intent and let the platform reconcile it. A manifest
that pins `:latest`, omits probes and resources, or forks instead of patches is
teaching the reader habits that fail in a real cluster.

## Probes: liveness vs readiness vs startup (structure — `watch`)

Use the three probes for their distinct jobs. Getting them wrong is a classic
anti-pattern a reader will copy:

- **readiness** — gates traffic. Fail it and the Pod leaves the Service
  endpoints but is not killed. Point it at a cheap "can I serve?" check.
- **liveness** — gates restarts. Fail it and the kubelet kills the container.
  Point it at a "am I wedged?" check; never at a dependency, or one slow
  downstream restarts your Pod in a loop.
- **startup** — protects slow starters so liveness does not kill them during
  boot. Use it for JVM apps with long warmup instead of a huge liveness
  `initialDelaySeconds`.

A single probe used for both liveness and readiness, or a liveness probe that
checks a database, is a finding. The scanner cannot reliably tell a correct probe
from a wrong one — this is checklist-only. For Quarkus/SmallRye, readiness is
`/q/health/ready` and liveness `/q/health/live`.

## Resource requests and limits (structure — checklist only)

Every container sets `resources.requests` (for scheduling) and `resources.limits`
(CPU and memory). No requests means the scheduler guesses and the Pod is first to
be evicted; no memory limit means one leak can take down a node. Missing
`resources:` is not reliably greppable, so the scanner leaves it to this
checklist — but it is a standard finding on every workload.

```yaml
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits:   { cpu: 500m, memory: 512Mi }
```

## Explicit image tags, never `:latest` (deprecated-habit — `ban`)

Pin an explicit, immutable tag (ideally a digest). `image: foo:latest` — or an
image with no tag, which resolves to `latest` — is non-reproducible and breaks
rollbacks; the scanner flags both. This mirrors the collection's "exact tags"
dependency policy.

```yaml
# before
image: ghcr.io/acme/order-service          # implicit :latest
image: ghcr.io/acme/order-service:latest

# after
image: ghcr.io/acme/order-service:1.4.2
```

## Recommended labels and selectors (structure)

Label with the `app.kubernetes.io/*` recommended set (`name`, `instance`,
`version`, `component`, `part-of`, `managed-by`) and keep the Deployment's
`selector.matchLabels` a stable subset — selectors are immutable, so do not put
`version` in them. A Service selector that matches on an ad hoc one-off label is a
finding.

```yaml
metadata:
  labels:
    app.kubernetes.io/name: order-service
    app.kubernetes.io/part-of: order-platform
    app.kubernetes.io/version: "1.4.2"
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: order-service   # stable subset, no version
```

## Config and secrets via `envFrom` / `valueFrom` (reinvented / structure)

Inject configuration from a ConfigMap and secrets from a Secret using
`envFrom`/`valueFrom`. Do not hardcode config values in the container spec, and
never put a credential in a plain env `value:` or bake it into the image.

```yaml
# before — hardcoded, secret in plain text
env:
  - { name: LOG_LEVEL, value: "info" }
  - { name: DB_PASSWORD, value: "s3cret" }

# after
envFrom:
  - configMapRef: { name: order-config }
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef: { name: order-db, key: password }
```

## `Deployment`, not a bare `Pod` (structure — `ban` for long-running workloads)

A long-running workload is a `Deployment` (or `StatefulSet`/`DaemonSet` where
those fit), which gives you replicas, rollouts, and self-healing. A bare
`kind: Pod` has none of that and does not reschedule — the scanner flags
`kind: Pod`. A bare Pod is legitimate only for a one-shot debug or a
`kubectl run` demo; confirm from context.

## kustomize: overlays patch, they do not fork (structure)

A kustomize overlay references the base via `resources:` and changes only what
differs, through `patches`/`patchesStrategicMerge`, `images:`, `replicas:`,
`configMapGenerator`. An overlay that copies the base YAML and edits it in place
has forked — it will drift from the base. That is the central kustomize finding.

```yaml
# overlays/prod/kustomization.yaml — references and patches, never copies
resources:
  - ../../base
images:
  - name: order-service
    newTag: "1.4.2"
patches:
  - path: replicas.yaml
    target: { kind: Deployment, name: order-service }
```

## Helm (structure / style)

- **`_helpers.tpl` for naming.** Define `name`, `fullname`, `labels`,
  `selectorLabels` as named templates and reuse them; do not repeat the same
  `{{ .Release.Name }}-order` expression across files.
- **Parameterize through `values.yaml`.** Image repo/tag, replica count,
  resources, and env are values with sane defaults — not hardcoded in templates.
  A template with a literal image tag is a finding.
- **`helm lint` clean.** Run it; the chart should lint without errors. This is a
  verify-gate step.
- **Whitespace control.** Use `{{-` / `-}}` so rendered YAML is valid and
  readable; a chart that renders with blank-line noise or broken indentation is a
  style finding.
- **Chart API version.** `apiVersion: v2` for current Helm; `v1` is legacy.

## OpenShift (structure) — authority: `lgtm-crc`

- Expose services with a **Route** (edge TLS termination), not by assuming a
  cloud `LoadBalancer` or an Ingress controller that CRC does not run.
- **Non-root, `restricted-v2`-friendly images.** Do not require a specific UID,
  do not assume root, and do not demand `anyuid` when the image can run under an
  arbitrary assigned UID. An image or manifest that only works as root is a
  finding on OpenShift.
- In-cluster builds use **BuildConfig/ImageStream** (binary S2I, or a
  Docker-strategy build for native) per `lgtm-crc`; do not depend on a host
  container engine for the OpenShift path.
- Keep OpenShift-specific objects out of the generic Kubernetes path — the
  collection's rule is that application code, images, and verification never
  depend on OpenShift-only features.
