# Preflight and prerequisites

What needs to be installed and configured on the host before the bootstrap can run,
and why. The `setup-profile.sh` script catches missing items and prints the fix,
but knowing them up front shortens the iteration cycle.

## Container runtime: Docker Engine

minikube runs with `--driver=docker --container-runtime=containerd` (runc inside
the node) on **Docker Engine** (`docker-ce`), reached through the docker context
`default` at `/var/run/docker.sock`. Docker Engine runs as a system service; no
desktop app is required or used. One driver/runtime pairing only: mixing
runtimes across a profile's life leaves state the other runtime cannot read, so
changing either means deleting and recreating the profile.

## Required tools

| Tool          | Why                                                                     | Verified version        |
|---------------|-------------------------------------------------------------------------|-------------------------|
| Docker Engine | Runs the minikube node container; builds project images                 | docker-ce 29.8.2        |
| minikube      | Local Kubernetes cluster (docker driver, containerd runtime)            | v1.39.0+                |
| kubectl       | Cluster control                                                         | 1.36.5 (matches cluster)|
| helm          | Chart-based installs of operators, observability components             | 4.x (3.13+ works)       |
| istioctl      | Installs the Istio control plane; must match the pinned Istio           | 1.31.1                  |
| python3, ss   | JSON parsing and the host-port conflict check in `setup-profile.sh`     | Fedora defaults         |

`setup-profile.sh` fails fast if any of these is missing and prints an install
pointer.

Versions are the newest stable at the time of the last survey, not a promise
that older ones fail. Re-check them upstream at the start of work and pass the
Kubernetes version explicitly (`--kubernetes-version`, default `v1.36.5` in
`setup-profile.sh`; minikube's own default can run ahead of the components). See
`versions.md` for the rule, the full pin table, and the re-check recipes.

### Install Docker Engine (Fedora and RHEL)

Check first:

```bash
docker --version && docker context show
```

Add Docker's repo. On Fedora:

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
```

On RHEL, use Docker's RHEL repo instead:

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/rhel/docker-ce.repo
```

Then install and start the engine, join the `docker` group, and pin the context:

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# log out and back in so the group applies, then:
docker context use default
docker run --rm registry.access.redhat.com/ubi10/ubi-minimal:10.2-1791444377 echo OK
```

Verified with `docker-ce 29.8.2-1.fc44`, `containerd.io 2.3.6`, and
`docker-buildx-plugin 0.37.1` on Fedora 44.

- **Install only Docker's packages.** Do not install Fedora's `moby-engine` or
  `podman-docker` alongside `docker-ce`; they provide a second `docker` CLI or
  daemon. `setup-profile.sh` fails if either is installed.
- **Context `default`, no `DOCKER_HOST`.** minikube follows the active docker
  context. `setup-profile.sh` fails unless the context is `default`, it points at
  `unix:///var/run/docker.sock`, and `DOCKER_HOST` is unset (or that socket).
- **`docker` group membership is root-equivalent.** Anyone in the group can
  start a privileged container and read or write any host file. Add only
  accounts you would give `sudo`.
- **dockerd and the iptables FORWARD chain.** `dockerd` manages iptables itself
  and may set the host `FORWARD` policy to `DROP`, which can cut traffic for
  libvirt VMs on the same host. Check `sudo iptables -S FORWARD | head -1`; if
  the libvirt bridge is affected, accept it in the `DOCKER-USER` chain (which
  Docker leaves alone): `sudo iptables -I DOCKER-USER -i virbr0 -j ACCEPT`.
- **Never `minikube config set`.** minikube's config is global and shared by
  every project on the host. Every flag is passed on `minikube start`, and every
  call names its profile (`-p`) and context (`--context` / `--kube-context`).
  Keep `minikube config view` empty.

### minikube, kubectl, helm, istioctl

Download the binaries from the upstream releases (minikube, kubectl, helm) and
the pinned Istio release (istioctl); place them on `PATH`.

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

## Node PID limit

The node is one container, so its PID limit caps every process in the
cluster; the full meshed stack runs roughly 2000+ tasks. Docker Engine sets no
default PID cap on the node container. `setup-profile.sh` reports the node's
`docker inspect -f '{{.HostConfig.PidsLimit}}' <profile>` after start and fails
only when a daemon-level `default-pids-limit` in `/etc/docker/daemon.json` caps
it below 4096 (remove or raise it, restart docker, recreate the profile).

## Host ports

Published host ports equal the NodePorts (30000-32767), bound to `127.0.0.1`.
`setup-profile.sh` checks each with `ss -ltn` before creating the profile and
names the owner of any port already in use. Keep project host ports out of the
ranges host services use: on Fedora Server and RHEL, Cockpit owns `9090`, so a
Prometheus-style UI published on the host uses `19090` (or a NodePort), never
`9090`.

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
- **Docker Engine, kubectl, helm, istioctl.** Same — assumed to be installed.
- **Application services.** The stack is the substrate; your project's
  Deployments are not part of this skill.
- **Anything cloud-specific.** No EKS, GKE, AKS, OpenShift handling here. See
  `runtime-portability.md` for how to translate.
