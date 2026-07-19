# Recurring eBPF / kernel gotchas

Concrete traps that cost hours the first time. Verified on Fedora 44, kernel
7.1.3; most are general to modern (6.x–7.x) kernels.

## Verifier

- **`ARG_CONST_SIZE` helpers reject a possibly-zero size.** Helpers like
  `bpf_probe_write_user(dst, src, len)` take the size as `ARG_CONST_SIZE` (not
  `_OR_ZERO`), so the verifier must prove `len > 0`. A length read from a map has
  range `[0, u32::MAX]`, and the `0` fails with **"R3 invalid zero-sized read"**.
  Fix: clamp with a lower bound the verifier can see — `if len == 0 || len > CAP
  { return }` gives it `1..=CAP`.
- **Bounded loops must cover the *real* data in one pass.** `getdents64` fills
  its whole buffer — `ls /proc` returns *all* 200+ entries in a single call, not
  N at a time. A `for _ in 0..64` cap silently scans only the first slice; there
  is no "next call" to catch the overflow. Size the bound to a realistic maximum
  (e.g. 512 for `/proc`) and `log()` if you ever truncate. A too-small constant
  cap is a silent-wrong-answer bug, not a crash.
- The verifier's error dump is your friend: run the loader with `RUST_LOG=info`
  (aya) and read the instruction trace + the final `R# ...` line — it names the
  exact register and reason.

## Kernel-version drift (the #1 cause of "it doesn't attach on my kernel")

- **Attach targets move.** kprobe/fentry function names come and go between
  kernels (e.g. `do_unlinkat` → `vfs_unlink`). A kprobe that attached last year
  may 404 now.
- **Struct/tracepoint field offsets are version-specific.** Reading
  `dentry->d_name.name` or a tracepoint arg at a hard-coded offset is brittle;
  the robust fix is CO-RE with BTF-generated types so offsets relocate. When you
  hard-code, say so in the verification note.
- **Struct_ops / kfunc signatures track kernel BTF.** e.g. a congestion-control
  vtable's `tcp_slow_start` return type changed to `__u32`; the C reference must
  match the kernel's BTF declaration or you get "conflicting types".

## Detection myths

- **`bpf_probe_write_user` does NOT taint the kernel or emit a `dmesg`/journal
  warning on modern kernels.** Verified on 7.1.3 across many loads while actively
  writing user memory: `/proc/sys/kernel/tainted` stayed `0`, `journalctl -k`
  logged nothing. Older tutorials lead detection with "watch for the taint" — it
  never fires. Rely on **enumerating loaded programs** (`bpftool prog show`) and
  **behavior-vs-config divergence** instead.

## Targeting syscall-result tampering

- **Target by *what the data is*, not which process or fd produced it.** A
  "tamper every `read()` by comm==X" filter also hits the dynamic loader's
  shared-library ELF reads and bricks the process. Matching a **content
  signature** (e.g. the first bytes of the file you mean to forge) is both safer
  (library/ELF reads never match) and more robust: processes often `lseek(0)` and
  **re-read** a file for their authoritative parse, and since you never modify
  the file on disk, *every* offset-0 read still matches the signature — so you
  tamper the parse read, not just the first read.

## Debugging systems code

- **You can't `strace` a setuid binary usefully** — ptrace drops setuid, so the
  trace is near-empty or the program misbehaves. Observe at the **kernel level**
  instead: `bpftrace` on the relevant tracepoints (`sys_enter_openat`,
  `sys_exit_read`, `lseek`) shows the real fd/offset/return behavior the target
  can't hide. That's how the sudoers re-read (`lseek(0)` + second read) was found.
- **`bpftrace` verifier-complexity limits** bite on `strcontains()` over long
  strings — clamp with `str(ptr, 24)`. Map key types must match exactly across
  probes (cast `args->fd`/`args->ret` to a common width).
- When a guest's userland is wedged by your own program, **observe and recover
  from the host** (`virsh`), not the guest.

## eBPF program lifecycle

- Programs detach when the loader process exits (aya drops them) — but an
  orphaned/backgrounded loader keeps them attached and can silently poison your
  next test. Check `pgrep -f <loader>` and `bpftool prog show` between runs.
- A struct_ops link pins as a **directory** under bpffs — `rm -rf`, not `rm -f`.
