# The KVM/libvirt VM lab: standing it up and using it

A disposable Fedora KVM guest is where kernel-side code runs — **never your own
machine**. You build on the host (fast toolchain, your editor), ship the binary
into the guest, and load it there under `sudo`. The guest is cattle: snapshot
it, wreck it with a destructive demo, revert in seconds.

## Architecture

- **Host** = your laptop/workstation: builds binaries, runs any observability
  stack as a container, holds the libvirt guests. eBPF/kernel code is **never
  loaded here.**
- **Guest(s)** = `${LAB_PREFIX}-target` (and optionally `${LAB_PREFIX}-peer` for
  two-host networking tests). Fedora Cloud Base via cloud-init, on the libvirt
  `default` NAT network. Exports telemetry back to a stack on the host bridge IP.
- **One knob:** `LAB_PREFIX` names everything. Default `lab` → `lab-target` /
  `lab-peer`. Set it to your project: `export LAB_PREFIX=myproject`.

## Host prerequisites (once)

```bash
sudo dnf install -y virt-install qemu-img cloud-utils libvirt   # cloud-utils gives cloud-localds
sudo systemctl enable --now libvirtd
sudo virsh net-start default; sudo virsh net-autostart default  # the NAT network
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
# wait ~60s for cloud-init, then:
scripts/lab/vm-ip.sh "$LAB_PREFIX-target"            # its DHCP lease
ssh fedora@"$(scripts/lab/vm-ip.sh "$LAB_PREFIX-target")" 'cat /var/log/lab-ready'   # expect "BTF: present" + kernel
scripts/lab/snapshot-vm.sh "$LAB_PREFIX-target"      # snapshot 'lab-ready' now it's tooled — your revert point
```

Notes:
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
scripts/lab/lab-up.sh                        # start guests, wait for leases, print IPs
eval "$(scripts/lab/lab-ips.sh)"             # export TARGET_IP / PEER_IP into your shell
scripts/lab/snapshot-vm.sh "$LAB_PREFIX-target"        # (re)take 'lab-ready' after tooling changes
scripts/lab/revert-vm.sh   "$LAB_PREFIX-target"        # undo a destructive demo in seconds
scripts/lab/lab-down.sh                      # graceful ACPI shutdown; FORCE=1 to power off a stuck guest
scripts/lab/destroy-vm.sh  "$LAB_PREFIX-target"        # tear all the way down, disks included
```

## Conventions for using the lab

- **Build on the host, run in the guest.** `cargo build --release` (or `clang
  -target bpf`) on the host; `scp`/deploy the artifact; load it under `sudo` on
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
