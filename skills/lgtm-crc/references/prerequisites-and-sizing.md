# Prerequisites and sizing

## Host

Fedora or RHEL, on bare metal or in a VM with nested virtualisation. CRC runs
the cluster in a libvirt VM, so the host needs KVM (`crc setup` checks and
configures it).

| Tool | Why | Notes |
|---|---|---|
| `crc` (OpenShift Local) | the cluster | needs a pull secret from a free Red Hat Developer account |
| `oc` | every script | ships with crc: `eval "$(crc oc-env)"` |
| `helm` | the chart | Helm 3.18+ or 4 |
| `jq` | InstallPlan selection, evidence | |
| `mvn` 3.9 + JDK 25 | host-side packaging for the in-cluster builds | SDKMAN, as in `lgtm-quarkus` |
| `skopeo` | re-checking image tags | `dnf install skopeo` |

No container engine is needed: images are built inside the cluster (binary
S2I and Docker-strategy builds). If the project uses a local engine for other
work, podman (crun) is fine alongside the CRC path; never mix runtimes in one
workflow (e.g. podman-built images handed to a containerd/runc cluster).

## One cluster at a time

Stop every other local cluster before `crc start`; two clusters on one host
compete for memory and produce failures that look unrelated:

```bash
minikube profile list            # stop any running profile:
minikube stop -p <profile>
```

`require_crc` in `lib.sh` refuses to run while a minikube profile is up.
When the work is done, run `teardown.sh` (it ends with `crc stop`). Stop,
don't delete: `crc delete` throws away the VM and the next start is slow.

## CRC is dedicated and cleaned after each use

One project owns the CRC while it runs. Before a run, inventory what is
there:

```bash
oc get sub,csv -A
oc get ns --no-headers -o name | grep -v -E '^namespace/(openshift|kube-|default$|hostpath-provisioner$)'
```

Anything foreign (another project's namespace, Subscription or CRDs) is
flagged to the user and removed only with their approval, by that project's
teardown if it has one. `install-infra.sh` refuses to share an AMQ Streams
Subscription with another project.

## Size the VM before the first start

Sizing only takes effect while CRC is stopped.

| Profile | vCPU | Memory | Disk | What fits |
|---|---|---|---|---|
| core | 6 | 20 GiB (20480) | 80 GB | services, Postgres, one-node Kafka |
| platform tier | 12 | 32 GiB (32768) | 80 GB | + OSSM 3, Kiali, CMA, OpenTelemetry, otel-lgtm, Ollama (4 GiB request), a native build pod (4-8 GiB), Argo CD |

```bash
crc config set cpus 12          # 6 for the core only
crc config set memory 32768     # 20480 for the core only
crc config set disk-size 80
crc setup
crc start --pull-secret-file ~/pull-secret.txt   # path only; never cat it
eval "$(crc oc-env)"
```

`crc setup` also makes `*.apps-crc.testing` and `api.crc.testing` resolve
on the host, which is what makes Routes reachable without tunnels.

## Credentials: the crc-admin context, never the password

`crc start` writes a `crc-admin` context into the kubeconfig and prints the
kubeadmin password. Nothing needs the password:

- every script calls `require_crc`, which switches to `crc-admin` and
  refuses any API server that is not `api.crc.testing`;
- no script, file, commit, evidence or chat output ever contains the
  kubeadmin password, a token (`sha256~...`) or the pull secret;
- if the user needs the web console login, tell them the command that
  retrieves it, `crc console --credentials`, and let them run it. Do not run
  it on their behalf and do not echo its output.

The pull secret stays a file the user downloaded; pass its path to
`crc start --pull-secret-file` once (crc stores it) and never read or print
its contents.
