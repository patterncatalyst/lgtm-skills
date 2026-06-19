# Example template — the runnable-example shape

Every hands-on chapter ships a runnable example with the *same shape*, so once a
reader has built one they have built them all — only the contents change per
topic. The exact files depend on your language and stack; what must stay
constant is the **shape** below. Replace `NAME`.

```
examples/NN-NAME/
├── README.md                 # what it does, how to drive it, verification-status section
├── <run script>             # e.g. demo.sh / Makefile / run.sh: build/set up → run → drive → point at result
├── <build/config files>     # whatever your stack needs (Cargo.toml, package.json, pyproject.toml, go.mod, …)
└── <source files>           # the actual code the chapter walks in "How the code works"
```

The four invariants every example honors:

1. **A single obvious entry point.** One run script the reader invokes with no
   arguments to get the full experience, with optional subcommands for the
   common partial steps (just build, just run, override a target). Document the
   subcommands in the script header.
2. **Self-contained and reproducible.** Pinned versions/toolchain (see
   `references/conventions.md`), no reliance on state from another example,
   and any required services/setup either started by the script or clearly
   listed as prerequisites.
3. **The README mirrors the chapter.** What it demonstrates, how to drive
   activity, what to look for in the output/UI, and a closing
   **verification-status** section listing exactly what a real run must confirm
   (it is `unverified` until then).
4. **The code is the code the chapter explains.** The source here is what the
   chapter's "How the code works" section walks call by call — keep them in
   lockstep so the prose never describes code that isn't present.

## `<run script>` (self-documenting header is required)

The header doubles as usage docs and shows the available subcommands. Adapt the
build/run lines to your stack; keep the structure.

```bash
#!/usr/bin/env bash
#
# examples/NN-NAME/demo.sh
#
#   ./demo.sh                 # build/set up + run (Ctrl-C to stop)
#   ./demo.sh build           # just build
#   TARGET=... ./demo.sh      # override a target/host/env if relevant
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)" && cd "$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# build → run → (drive activity if relevant) → print where to see the result
```

## `README.md`

Mirror the chapter: what it demonstrates, how to drive activity, what to look
for in the output/UI, and a closing **verification-status** section listing
what must be confirmed on a real run (it stays `unverified` until then).

## Adapting per stack

The original of this template used a three-crate Rust/Aya workspace with a
`build.rs`, a `no_std` shared-types crate, and a privileged loader deployed to a
VM. That is one valid *instantiation* of the shape above — not a requirement.
For a Python tutorial it might be a package + `pyproject.toml` + a `run.sh`; for
a web tutorial a `package.json` + a dev-server script. Pick the smallest
structure that satisfies the four invariants, then use it for **every** example
in that tutorial so they stay uniform.
