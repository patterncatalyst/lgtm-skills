---
name: lgtm-systems-programming
description: Hard-won conventions and gotchas for writing, verifying, and demoing low-level systems code — eBPF/kernel programs, syscall-level tooling, anything privileged that runs against a real kernel — plus a ready-to-use KVM/libvirt VM lab (provision + daily lifecycle scripts) so you never load experimental kernel code on your own machine. Use this whenever you are building or debugging systems/kernel/eBPF code, deciding whether a low-level example is really "verified" (it must produce its observable effect, not just load cleanly), writing a demo that could wedge or lock you out of the host, standing up or tearing down a disposable Linux VM to test kernel-side code against, hitting kernel-version drift (attach targets, struct/tracepoint offsets, verifier rules that changed between kernels), or orchestrating verification runs across many examples. Triggers on "set up a VM lab / test VM for kernel work", "provision a Fedora KVM guest", "is this eBPF example actually working", "the verifier rejects my program", "this demo bricked/locked out the box", "why doesn't my probe fire on this kernel", or any systems-programming task where the build succeeding is not the same as the code working. Ships parameterized lab scripts (set LAB_PREFIX to your project) — provision, up/down, snapshot/revert, destroy — and a cloud-init template.
---

# Systems-programming: verify behaviorally, run in a throwaway VM

This skill is the **domain companion** to the topic-agnostic tutorial/site
skills. Where `lgtm-tutorial` says *how* to write a good chaptered tutorial,
this skill captures *what bites you when the subject is kernel-adjacent systems
code* — and gives you a disposable VM lab to run it in safely. It is built from
real failures on the "eBPF with Aya" project (kernel 7.1.3, Fedora 44).

Three pillars:

1. **"Verified" means the observable effect happened** — not that it built,
   loaded, or attached. See `references/verification-and-safety.md`.
2. **Privileged/destructive demos must self-terminate and be recoverable** —
   they *will* eventually wedge the box. Same reference.
3. **Run kernel-side code in a throwaway VM, never on your machine** — the
   `scripts/lab/` here provision one and manage its daily lifecycle. See
   `references/vm-lab.md`.

Plus a reference of recurring **kernel/eBPF gotchas** that cost hours the first
time: `references/kernel-gotchas.md`.

## When to use this skill

- Writing or reviewing eBPF / kernel / syscall-level code, or its demos.
- Deciding whether a low-level example is genuinely verified before you mark it
  so (the mistake this skill exists to prevent: a program that loads and
  attaches cleanly but whose promised effect never happens).
- Standing up, snapshotting, reverting, or tearing down a Linux test VM for
  kernel work.
- Debugging "it attaches but does nothing", "the verifier rejects it", "the
  probe won't fire on this kernel", or "the demo locked me out of the host".

## The one rule that matters most

**Build/load/attach/start success is a checkpoint, never the finish line.** A
systems program that runs without error but produces none of its claimed effect
is still broken — a process-hider that hides nothing, a probe whose map stays
empty, an enforcement hook that denies nothing. Drive it, watch the effect,
and prefer a before/after negative control (attach → effect present; detach →
effect gone). Write the status *behaviorally*: "victim → uid=0 while attached,
denied on detach, file on disk unchanged" is verification; "builds, loads, and
attaches cleanly and runs without error" describes a program that does nothing.

## Systems-programming conventions

Code-level defaults that keep low-level examples correct and reviewable. Details
and the failures behind them are in the references.

- **Separate the kernel program from its loader.** Kernel side is `no_std`,
  minimal, does no formatting/IO; the user-space loader does the loading,
  attaching, map reads, and telemetry. Share types across the boundary as
  `#[repr(C)]` structs in one common crate — defined once, not twice.
- **Bound every loop, and size the bound to the real data**, not a comfortable
  constant. A cap smaller than the actual input is a silent-wrong-answer bug
  (see `kernel-gotchas.md`).
- **Prefer CO-RE/BTF over hard-coded struct/arg offsets.** When you must
  hard-code an offset, flag it as version-specific in the verification note —
  it's the first thing to break on another kernel.
- **Don't silently ignore helper failures where correctness depends on them.**
  `bpf_probe_read/write`, map lookups, and size clamps have return values;
  a swallowed error becomes a probe that "runs" but does nothing.
- **Make the effect observable.** Emit a counter/metric (OTLP → Grafana here)
  so verification watches a signal, not an inference. If nothing moves, nothing
  happened.
- **Read the verifier's rejection trace; don't guess.** `RUST_LOG=info` (aya)
  prints the instruction-by-instruction trace and the exact failing register.
- **Every runnable example ships a `demo.sh` and a README with a *behavioral*
  verification note** — build → deploy → drive → observe, and what a real run
  must confirm.
- **Destructive helpers are LAB-ONLY, tightly scoped, and self-terminating.**
  Gate them, target by pid/cgroup/path/content-signature, and launch under a
  `timeout` (see `verification-and-safety.md`).

## The VM lab in one screen

Set one knob — your project name — then provision:

```bash
export LAB_PREFIX=myproject          # VMs become myproject-target / myproject-peer
export LIBVIRT_DEFAULT_URI=qemu:///system
scripts/lab/provision-vm.sh "$LAB_PREFIX-target"     # Fedora KVM guest via cloud-init
scripts/lab/snapshot-vm.sh  "$LAB_PREFIX-target"     # snapshot 'lab-ready' once it's tooled
```

Daily rhythm:

```bash
scripts/lab/lab-up.sh            # start guests, print IPs
scripts/lab/revert-vm.sh "$LAB_PREFIX-target"   # undo a destructive demo in seconds
scripts/lab/lab-down.sh          # graceful shutdown; FORCE=1 to power off
scripts/lab/destroy-vm.sh "$LAB_PREFIX-target"  # tear all the way down (disks too)
```

Everything is parameterized by `LAB_PREFIX` (default `lab`). The scripts force
`qemu:///system`; if your login shell isn't in the `libvirt` group yet, wrap a
command as `sg libvirt -c '...'`. Details, prerequisites, and how to adapt the
cloud-init package set are in `references/vm-lab.md`.

## References

- `references/verification-and-safety.md` — what "verified" requires for systems
  code; the destructive-demo safety pattern (self-terminate + snapshot
  recovery); and an orchestration note (verifying many examples with a workflow,
  incl. the `args` gotcha).
- `references/vm-lab.md` — the lab architecture, prerequisites, provisioning,
  lifecycle, and how to reparameterize for a new project.
- `references/kernel-gotchas.md` — recurring eBPF/kernel gotchas (verifier
  `ARG_CONST_SIZE`, kernel-version offset drift, `bpf_probe_write_user` not
  tainting on modern kernels, bounded-loop sizing, content- vs comm/fd-targeting,
  can't-strace-setuid → observe at the kernel level).

## Multi-example verification → `lgtm-relay`

Verifying a batch of examples against a kernel is relay-shaped: Opus plans which
examples run where and what observable effect each must produce, Sonnet executors
run them in the VM lab, Opus judges the evidence. See the `lgtm-relay` skill.

Two constraints override the relay's defaults here. Executors sharing one VM must
be **sequenced, not parallel** — concurrent kernel-side loads interfere, and a wedged
guest takes the whole batch with it. And the validator applies the rule above: a
program that loaded cleanly is not a program that worked, so "no errors" is reported
as unverified, never as passed.
