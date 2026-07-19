# Verifying systems code, and demoing it safely

## 1. "Verified" means the observable effect happened

The single most expensive mistake in low-level work is treating a clean
build/load/attach as verification. It isn't. The kernel accepting your program
proves it's *safe to run*, not that it *does the thing*.

Real cases from this project:

- **pidhide** loaded and attached cleanly, the loader logged "attached — pid is
  now hidden", and it hid **nothing** — a `for _ in 0..64` record walk covered
  only the first slice of a live `/proc` (200+ entries in a single
  `getdents64`). "Runs without error" was true of a program that did nothing.
- **sudoadd** loaded fine and its tamper counter moved — while clobbering the
  *wrong* reads (shared-library ELF headers), so no privilege was ever granted.

To promote a systems-code claim to verified:

- **Drive the demo and observe the claimed effect.** The process disappears
  from `ls /proc`; the map/histogram fills; the packet is dropped; the connect
  is denied; `uid=0` is granted. Watch the effect, not the exit code.
- **Prefer a negative control.** Attach → effect present; detach → effect gone.
  A before/after pair (denied → uid=0 → denied) is far stronger than a single
  "it worked", and it catches "it was already true for another reason"
  (e.g. a stale instance still attached, a pre-existing sudoers grant).
- **Write the status behaviorally.** Record *what you observed*:
  > "victim → uid=0 while attached, denied on detach, `/etc/sudoers` unchanged"

  not "builds, loads, and attaches cleanly and runs without error" — that
  sentence is true of a broken program.
- **Guard against contamination.** Before a before/after run, confirm no prior
  instance is still attached (`pgrep -f`, `bpftool prog show`) and no residual
  state (a leftover file, a pinned map) is faking the result. A stale attached
  loader silently poisons the "before" reading.

## 2. Destructive/privileged demos must self-terminate and be recoverable

Anything that writes user/kernel memory, denies syscalls, or edits security
policy *will* eventually wedge the box — and can lock you out of the tools you'd
use to recover. On this project a naive sudoers-forging probe corrupted `sudo`'s
own shared-library reads, so `sudo` itself stopped working: you couldn't
`sudo pkill` the offending program. A VM reboot was the only way back.

Rules for destructive demos:

- **Never on your own machine — only in the throwaway VM** (see
  `references/vm-lab.md`). eBPF/kernel experiments taint or crash kernels.
- **Self-terminate.** Launch the loader under a bound so it dies on its own even
  if your control channel drops:
  ```bash
  sudo bash -c 'nohup timeout 20 ./offensive-loader args >/tmp/out 2>&1 &'
  ```
  Don't rely on being able to kill it later — the thing it breaks may be the
  thing you'd kill it with.
- **Have an out-of-band recovery.** Snapshot the guest *before* running
  destructive demos and revert in seconds (`snapshot-vm.sh` / `revert-vm.sh`),
  or reboot the guest from the host (`virsh reboot <vm>`) when the guest's own
  userland is wedged. `/tmp` on the guest is tmpfs — a reboot also clears
  deployed test binaries.
- **Scope as tightly as the mechanism allows** — by pid, cgroup, path, or a
  content signature — so a bug affects one target, not the whole system.
- **Decide fail-open vs fail-closed deliberately** for inputs the program can't
  classify; a system-wide deny is a very big hammer.

## 3. Orchestrating verification across many examples

When a corpus has dozens of examples/READMEs to verify or reconcile, a
deterministic fan-out (one agent per example) beats doing them serially — but
the *run* itself is often serial when it targets one physical VM. Split it:
scout/verify behavior inline on the VM (serial, one box), then fan out the
*documentation* reconciliation (parallel, independent files).

Gotchas learned doing this here:

- **`args` passed to a workflow can arrive as a JSON string, not the array you
  passed.** Guard at the top of the script:
  ```js
  const ITEMS = typeof args === 'string' ? JSON.parse(args) : args
  ```
  Otherwise `args.map(...)` throws `args.map is not a function` and the whole
  run dies before the first agent.
- **Sync, don't invent.** When fanning out to update per-example status, have
  each agent *read the authoritative source* (the chapter's verified statement)
  and match it — never let an agent fabricate a verification it didn't observe.
- **Preserve caveats.** A blanket "verified" sweep must keep genuine per-item
  limitations (host-only, partial/SKB-mode, kernel-version floor, in-VM
  modelling) rather than flattening them.
