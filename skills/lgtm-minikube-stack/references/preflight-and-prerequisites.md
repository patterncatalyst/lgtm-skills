# Preflight and prerequisites

What needs to be installed and configured on the host before the bootstrap can run,
and why. The `setup-profile.sh` script catches missing items and prints the fix,
but knowing them up front shortens the iteration cycle.

## Required tools

| Tool      | Why                                                                          | Verified version       |
|-----------|------------------------------------------------------------------------------|------------------------|
| minikube  | Local Kubernetes cluster                                                     | 1.37.0+                |
| kubectl   | Cluster control                                                              | Matches cluster (1.35+)|
| helm      | Chart-based installs of operators, observability components                  | 3.13+                  |
| podman    | Rootless container runtime that minikube drives                              | 4.7+                   |

The bootstrap fails fast if any of these is missing and prints an install pointer.

### Install commands per platform

**Fedora / RHEL / CentOS Stream:**
```bash
sudo dnf install -y podman
# minikube, kubectl, helm: download binaries from upstream releases
```

**Ubuntu / Debian:**
```bash
sudo apt-get install -y podman
# minikube, kubectl, helm: download binaries from upstream releases
```

**macOS** (via Homebrew):
```bash
brew install minikube kubectl helm podman
podman machine init && podman machine start
```

## Required kernel limits

### `fs.inotify.max_user_instances` ≥ 256

Why: every Kubernetes controller (and Loki/Tempo/Mimir individually) opens
inotify watches against the host. Fedora's default of 128 is exhausted by the
time the third LGTM component is installed; subsequent controllers fail with
opaque "too many open files" errors that look nothing like an inotify problem.

**Fix:**
```bash
sudo tee /etc/sysctl.d/99-kubernetes.conf <<EOF
fs.inotify.max_user_instances = 512
fs.inotify.max_user_watches = 524288
EOF
sudo sysctl -p /etc/sysctl.d/99-kubernetes.conf
```

### `fs.inotify.max_user_watches` ≥ 524288

Same reason, related limit. The fix above sets both.

## Required podman configuration

### `pids_limit` unlimited (or ≥ 8192)

Why: the podman driver creates the minikube node as a single container, and that
container inherits podman's default `--pids-limit=2048`. The whole stack runs
roughly 2000+ tasks at steady state (each component is a JVM or a Go process
with goroutines; with Istio sidecars, each pod runs two processes). When the
cap is hit, kubelet can't fork the next pod's init, and the failure looks like
runc exiting 128 with EAGAIN ("resource temporarily unavailable") — far from
the actual cause.

The node-container's `pids.max` is not writable live on a rootless node
(Operation not permitted from the container's perspective). The only durable
fix is at podman level, before the node is created.

**Fix:**
```bash
mkdir -p ~/.config/containers
printf '[containers]\npids_limit = 0\n' >> ~/.config/containers/containers.conf
# 0 means unlimited; alternatively set to a number ≥ 8192.
```

Once changed, the minikube node has to be recreated to pick up the new default.
Either delete and re-bootstrap, or pass `--replace` to `setup-profile.sh`.

## Recommended resources

The verified configuration:

- **64 GB host RAM.** The cluster's minikube profile uses 24 GB; the rest is
  host headroom for IDEs, browsers, the user's terminal, host services. With
  32 GB host RAM the cluster runs but the host is uncomfortably constrained.
- **16 vCPUs.** The profile uses 16; on host CPUs with fewer cores it spreads
  across all of them.
- **1 TB disk.** The cluster's profile uses 80 GB. The host needs ≥30 GB
  beyond that for the image cache and PVs that grow over time.

Smaller hosts work but require tuning. See `lgtm-on-minikube-sizing.md` for
the trim guide.

## What the bootstrap does NOT install

- **minikube itself.** The bootstrap calls `minikube start` but doesn't have
  the binary on its own.
- **kubectl, helm, podman.** Same — assumed to be on PATH.
- **Application services.** The stack is the substrate; your project's
  Deployments are not part of this skill.
- **Anything cloud-specific.** No EKS, GKE, AKS, OpenShift handling here. See
  `runtime-portability.md` for how to translate.
