# The KVM/libvirt VM lab: standing it up and using it

A disposable Fedora KVM guest is where kernel-side code runs — **never your own
machine**. You build on the host (fast toolchain, your editor), ship the binary
into the guest, and load it there under `sudo`. The guest is cattle: snapshot
it, wreck it with a destructive demo, revert in seconds.

## Architecture

- **Host** = your laptop/workstation: builds binaries, runs any observability
  stack as a container, holds the libvirt guests. eBPF/kernel code is **never
  loaded here.**
- **Guest(s)** = `${LAB_PREFIX}-target` (and optionally `${LAB_PREFIX}-peer`).
  Fedora Cloud Base via cloud-init, with **passt** networking and **ssh over
  vsock** (below). Telemetry reaches a stack on the host through the guest's
  default gateway address, which passt maps to the host's loopback.
- **One knob:** `LAB_PREFIX` names everything. Default `lab` → `lab-target` /
  `lab-peer`. Set it to your project: `export LAB_PREFIX=myproject`.

## Networking: passt + vsock, nothing changed on the host

The lab must never put the host at risk, and the host is often shared by several
engineers whose other software (Docker, Podman, firewalld zones) you don't
control. So the guests use no host networking state at all:

- **passt** (`--network type=user,backend.type=passt`): QEMU's user-mode backend.
  The guest's traffic leaves through ordinary unprivileged sockets that passt
  opens on the host. No bridge, NAT, IP forwarding or firewall rule is involved.
- **ssh over AF_VSOCK** (`--vsock cid.auto=yes`): libvirt's ssh proxy
  (package `libvirt-ssh-proxy`) connects to the guest's vsock, and the guest's
  systemd (≥ 256) starts sshd on vsock by itself. No guest IP, no host port.
  `lab-ssh.sh` writes a lab-only ssh config giving each `<prefix>-*` guest a
  plain alias (`HostName qemu:system/%h` + the proxy as `ProxyCommand`), with a
  lab-only known_hosts file. Use that config for copies too
  (`scp -F "$(scripts/lab/lab-ssh.sh --config)" f <vm>:`): the proxy's own
  names (`qemu:system/<vm>`, `qemu/<vm>`) contain a colon or slash that scp and
  rsync misparse as a remote or local path.

Why not the libvirt `default` NAT network: it routes guest traffic through the
host's FORWARD chain, and Docker Engine sets that chain's policy to DROP when it
starts. Every NAT'd guest then loses outbound access (cloud-init hangs on
`dnf makecache`) the day Docker is installed, and the "fix" is changing the
shared host's firewall. The eBPF-with-Aya lab ran on `default` before Docker
Engine was on the host; the same lab failed afterwards.

The cost: guests cannot reach each other. A two-guest networking test needs a
deliberate design (candidate: a second NIC as a QEMU UDP-socket point-to-point
link on host loopback, `--network type=udp,...`; **unverified**, prove it before
relying on it), never a change to the host's firewall.

## Host prerequisites (once)

```bash
sudo dnf install -y virt-install qemu-img cloud-utils libvirt libvirt-ssh-proxy passt passt-selinux
sudo systemctl enable --now libvirtd
sudo usermod -aG libvirt "$USER"      # then re-login, OR wrap commands: sg libvirt -c '...'
[ -f ~/.ssh/id_ed25519.pub ] || ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519
```

The lab uses the **system** libvirt instance. Always
`export LIBVIRT_DEFAULT_URI=qemu:///system` (the scripts default to it). If your
current shell predates the group add, run any `virsh`/script through
`sg libvirt -c '...'`.

## Standing up a guest

```bash
export LAB_PREFIX=myproject
export LIBVIRT_DEFAULT_URI=qemu:///system
scripts/lab/provision-vm.sh "$LAB_PREFIX-target"     # downloads Fedora Cloud once, layers an overlay disk
# wait for cloud-init (a few minutes), then:
scripts/lab/lab-ssh.sh "$LAB_PREFIX-target" cat /var/log/lab-ready   # expect "BTF: present" + kernel
scripts/lab/snapshot-vm.sh "$LAB_PREFIX-target"      # snapshot 'lab-ready' now it's tooled — your revert point
```

Notes:
- **Check package names, not just that the install ran.** On Fedora 44,
  `rt-tests` is an unrelated package; `cyclictest` ships in `realtime-tests`.
  The readiness marker must probe each tool (`command -v cyclictest`), so a
  wrong name surfaces as `INCOMPLETE` instead of a silent gap.
- **A readiness marker probes the running service, not the binary.** `command -v
  docker` passes while `dockerd` is crash-looping; check `docker info`.
- **Booting a custom kernel on Fedora Cloud: set the default by BLS entry id.**
  `/boot` is a btrfs subvolume there, grubby mis-resolves paths
  (`/boot/boot/vmlinuz-…`) and `--set-default` silently does nothing. Use
  `grub2-set-default <id from /boot/loader/entries>`, then check `uname -rv`
  after the reboot.
- **Fedora's realtime kernel config drops legacy iptables**
  (`CONFIG_NETFILTER_XTABLES_LEGACY` unset). Install `iptables-nft` and select it
  with `alternatives --set iptables /usr/bin/iptables-nft`, or Docker fails to
  start on the RT kernel. Mainline PREEMPT_RT also has no `/sys/kernel/realtime`:
  verify with `uname -v` and `CONFIG_PREEMPT_RT=y` in `/boot/config-$(uname -r)`.
- **Pin and verify the base image filename.** `provision-vm.sh` pins a Fedora
  Cloud Base qcow2 name that can 404 when the mirror rolls; confirm/override
  `BASE_IMG` at the URL in the script header before the first download.
- **Confirm BTF.** CO-RE needs `/sys/kernel/btf/vmlinux`; the cloud-init
  `runcmd` writes `BTF: present` to `/var/log/lab-ready`. No BTF → fentry/fexit
  and CO-RE won't load.
- **Customize the toolset** in `cloud-init/user-data.tmpl` — the shipped package
  set is kernel-tooling-heavy (clang/llvm, bpftool, bpftrace, bcc, libbpf-devel,
  perf, dwarves). Trim or extend for your subject.

## Daily lifecycle

```bash
scripts/lab/lab-up.sh                        # start guests, wait for ssh over vsock
scripts/lab/lab-ssh.sh [vm [command...]]     # ssh over vsock via the generated config
scripts/lab/snapshot-vm.sh "$LAB_PREFIX-target"        # (re)take 'lab-ready' after tooling changes
scripts/lab/revert-vm.sh   "$LAB_PREFIX-target"        # undo a destructive demo in seconds
scripts/lab/lab-down.sh                      # graceful ACPI shutdown; FORCE=1 to power off a stuck guest
scripts/lab/destroy-vm.sh  "$LAB_PREFIX-target"        # tear all the way down, disks included
```

## Conventions for using the lab

- **Build on the host, run in the guest.** `cargo build --release` (or `clang
  -target bpf`) on the host; `scp`/`rsync` the artifact with `-F "$(scripts/lab/lab-ssh.sh --config)"` to `<vm>:`; load it under `sudo` on
  the guest. eBPF **never** loads on the host — safety and reproducibility.
- **Snapshot before destructive work, revert after.** Take `lab-ready` once the
  guest is fully tooled. Offensive/enforcement demos (memory writes, syscall
  denials, policy edits) get a `revert-vm.sh` afterward — cheaper and cleaner
  than un-doing by hand.
- **Bring the lab down when done.** A running guest burns CPU (and an orphaned
  in-guest load generator can peg a core). `lab-down.sh` at the end of a session;
  the guest's disks and snapshots survive for next time.
- **Reap backgrounded processes on demo exit.** Demos that launch guest-side load
  generators must `trap` cleanup on EXIT/INT/TERM and `pkill` them on the guest —
  otherwise they outlive the demo and skew the next run (and CPU).
- **One physical VM ⇒ verification is serial.** Don't fan out parallel agents
  that all SSH into the same guest and fight over it. Scout/verify behavior
  inline (serial), then parallelize only independent work (e.g. doc updates).
- **Recover from the host when the guest wedges.** If a demo breaks the guest's
  own userland (you can't `sudo` inside it), `virsh reboot`/`virsh destroy` +
  start, or `revert-vm.sh`, from the host.
- **zsh doesn't word-split unquoted variables.** `$SSH`/`$SSHOPTS` holding
  multiple flags won't split the way bash does — use literal ssh flags, an
  array, or pipe a script via `ssh host 'bash -s' <<'EOF'`.

## Reparameterizing for a new project

Everything keys off `LAB_PREFIX`. The scripts also read a small cache dir
(`$HOME/.cache/${LAB_PREFIX}-lab`) and the cloud-init template writes
`/var/log/lab-ready`. To adopt in a new repo: copy `scripts/lab/` in, set
`export LAB_PREFIX=<project>`, edit the package list in
`cloud-init/user-data.tmpl` for your subject, and you're provisioning.
