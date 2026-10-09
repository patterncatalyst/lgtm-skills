# Runtime portability

The verified runtime for this stack is minikube v1.39.0 on Fedora 44 with
Docker Engine (`docker-ce`, context `default`), `--driver=docker
--container-runtime=containerd` (runc inside the node), and Kubernetes v1.36.5.
Images are built with `docker build` and loaded with `minikube image load`;
host access is NodePorts published on `127.0.0.1` at profile creation. Other
Kubernetes runtimes work in principle, but the bootstrap and
the chart values aren't tested against them. This document captures what
changes per runtime, organized as honest deltas — what you need to adjust,
what stays the same.

## What stays the same across runtimes

The architectural choices that apply to any Kubernetes:

- **Istio service mesh** — Istio works on any conformant cluster. Some
  vendors ship a productized fork (OpenShift Service Mesh, ASM); use those
  if you're on those platforms.
- **CloudNativePG** — vendor-neutral Postgres operator; works on any cluster.
- **Strimzi** — vendor-neutral Kafka operator; works on any cluster.
- **KEDA** — vendor-neutral autoscaler; works on any cluster.
- **LGTM stack** — Grafana's L+G+T+M plus the OTel Collector; the helm charts
  are cluster-agnostic. The chart values may need re-sizing for the target
  runtime.
- **Kiali, Apicurio, OpenMetadata** — all vendor-neutral.

## What changes per runtime

### OpenShift

OpenShift is the runtime this stack pairs most naturally with — it's
deliberately Kubernetes-compatible.

- **Mesh:** prefer **Red Hat OpenShift Service Mesh** (a productized Istio
  bundle that ships through OperatorHub). The `setup-istio.sh` script
  installs upstream Istio; for OSSM, use the OperatorHub install instead.
- **Operators:** prefer OperatorHub / OLM for Postgres (Crunchy or CNPG),
  Kafka (AMQ Streams = productized Strimzi), KEDA (Custom Metrics Autoscaler,
  productized KEDA). The setup scripts install upstream operators directly;
  for OpenShift, install through OperatorHub instead.
- **Operator version pins:** the newest-stable rule (`versions.md`) applies to
  OpenShift / CRC operator pins too. Subscribe to the channel, install the
  newest CSV in it, and approve only that InstallPlan; do not approve an older
  InstallPlan the subscription generated, and re-check the channel's newest
  CSV (`oc get packagemanifest <name> -o jsonpath='{.status.channels[*].currentCSV}'`)
  at the start of work.
- **Namespaces:** OpenShift calls these **Projects**. The `oc new-project`
  command creates them with conventional defaults; subsequently they behave
  as namespaces.
- **Pod security:** OpenShift uses **Security Context Constraints (SCCs)**
  instead of PodSecurity admission. Most charts handle this transparently; a
  few need `oc adm policy add-scc-to-user` to grant a SCC the chart's pods need.
- **Base images:** OpenShift's supply chain pairs naturally with Red Hat UBI
  (`ubi10/python-314-minimal`, etc.). Different from the upstream `python:3.14-slim`
  default in many examples; substitution is one line in the Containerfile.

### EKS (AWS)

- **Persistent volumes:** EKS uses EBS by default. The PVCs in `setup-lgtm.sh`
  request 5 GiB each; EBS gp3 fits this trivially. Adjust the storage class
  if you want gp2 or io1.
- **Load balancers:** Services of type `LoadBalancer` get AWS NLBs/ALBs. The
  bootstrap doesn't create any (everything is ClusterIP); if your application
  layers do, expect AWS-specific annotations.
- **IAM:** ServiceAccounts that need AWS APIs use IRSA (IAM Roles for Service
  Accounts). Not relevant to the substrate; relevant if you're using e.g. S3
  for Loki/Tempo/Mimir storage instead of filesystem PVCs.
- **Node PID limit:** doesn't apply; EKS nodes are EC2 VMs, not a single
  node container.
- **Inotify:** EC2 default inotify limits are higher than Fedora's; usually
  passes without tuning.

### GKE (Google Cloud)

- **Persistent volumes:** PD-standard or PD-SSD via storage classes. The 5 GiB
  PVCs fit either.
- **Workload Identity:** the GCP equivalent of IRSA, used when ServiceAccounts
  need GCP APIs.
- **Autopilot vs Standard:** Autopilot clusters don't let you tune node-level
  things; some chart values (specifically those that set host-side flags) need
  to be removed.

### AKS (Azure)

- **Persistent volumes:** Azure Disk or Azure Files via storage classes.
- **Workload Identity:** AKS-specific federated identity story for pod-to-Azure
  authentication.

### Vanilla Kubernetes (kubeadm, k3s, on bare metal)

- **Storage:** depends on what's installed. Local-path-provisioner (k3s
  default) and Longhorn both work; the 5 GiB PVCs fit either.
- **MetalLB or similar:** for LoadBalancer Services. Not needed for the
  stack itself; needed if your applications use LoadBalancer Services.
- **Ingress:** none assumed by this stack. Bring your own (nginx-ingress,
  Traefik, etc.) if you want HTTPS termination at the edge.

## The minikube delta

What's specific to the verified minikube runtime that won't apply elsewhere:

- **Docker Engine preflight** — the docker context, socket, and package checks
  in `setup-profile.sh` exist because the node is a Docker container. Other
  runtimes have no equivalent.
- **Node PID limit** — the single node container's `PidsLimit` caps every
  process in the cluster. EC2 VMs, GCE VMs, bare metal nodes don't apply.
- **Image distribution** — `docker build` + `minikube -p <profile> image load`,
  bare image names, `imagePullPolicy: Never`, and a `rollout restart` after each
  reload. Other runtimes push to a registry instead (OpenShift's internal
  registry, ECR, GCR, ACR, Quay, Harbor) and drop `imagePullPolicy: Never`.
- **Published NodePorts** — `--ports=127.0.0.1:<np>:<np>` is a minikube docker
  driver feature. Elsewhere use Routes (OpenShift), Ingress, or LoadBalancers.
- **Resource sizing** — the 24 GB / 16 vCPU profile is sized for a single
  minikube node. Other runtimes give you per-node sizing that's specific to
  the cloud you're on.

## Verification status by runtime

| Runtime              | Status         |
|----------------------|----------------|
| minikube v1.39.0, docker driver + containerd on Docker Engine (Fedora 44) | **verified** |
| OpenShift (4.x)      | architecturally portable; not tested by this skill |
| EKS                  | architecturally portable; not tested by this skill |
| GKE Standard         | architecturally portable; not tested by this skill |
| AKS                  | architecturally portable; not tested by this skill |
| k3s                  | architecturally portable; not tested by this skill |

For each unverified runtime, contributions that add a sibling bootstrap
script + a README documenting the delta are welcome. The proven pattern for
porting is: take `setup-profile.sh.template`, replace the minikube-specific
parts with the target runtime's equivalents, keep everything else.
