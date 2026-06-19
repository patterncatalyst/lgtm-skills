# Conventions, house style & validation

The point of this page is consistency: a multi-chapter tutorial reads like one
book only if every chapter makes the same choices. Fill in the project's
specifics once, here, and apply them identically everywhere. The **validation
snippets** and the **`unverified` discipline** at the bottom are reusable as-is.

## House-style checklist (fill in per tutorial)

Record the project's actual choices in this section so every chapter and example
matches. Suggested fields:

- **Pinned versions** — language/runtime, key libraries, tools, and any
  service/image tags, each pinned to a specific version and dated. Re-verify
  against upstream before each release; versions drift.
- **Tooling & commands** — the CLI/runtime the reader uses; container engine (if
  any) and its conventions; loopback address vs `localhost`; volume-mount flags;
  fully-qualified image/package references; a command-prefix convention that
  shows *where* a command runs (host vs guest vs container); single-line,
  paste-safe commands.
- **What is and isn't containerized / sandboxed**, and why — keep this rule
  uniform across examples.
- **Where tooling comes from** — distro repos vs language version manager vs
  vendor — pick per tool and stay consistent.
- **Lab / environment setup** — any VM/device/service the examples assume, and
  the script(s) that provision it.

> Example instantiation (from the original eBPF tutorial, for reference only —
> replace wholesale): Rust pinned in `rust-toolchain.toml`; Aya 0.13.x / aya-ebpf
> 0.1.x; OpenTelemetry 0.27 over OTLP/HTTP; Fedora 44 guests; Podman 5.x;
> `grafana/otel-lgtm` 0.28.0 (Grafana 3000, OTLP 4317/4318); Podman not Docker,
> `127.0.0.1` not `localhost`, `:Z` on mounts, fully-qualified UBI images,
> kernel tooling from distro repos, Rust via rustup. Your tutorial's list will
> look nothing like this — that's the point.

## Naming & site config (fill in per tutorial)

- `github_username`, `github_repo`, and `baseurl` (`"/repo-name"` for a project
  Pages site, `""` for a user/org site).
- Brand accent color (one token trio in the site CSS), brand emoji/glyph, fonts.
- License (state it; note any per-component license differences).
- Parts are referred to by `Part {order}` (the first part = Part 0). A new
  chapter's `part:` must exactly equal a `_parts` `part_name`.

## Static validation (no Jekyll/Ruby needed)

Run these before packaging — they catch the failures that actually bite
chaptered Jekyll sites. Adjust the run-script glob to your project's convention.

```bash
# 1. front matter parses (watch for unquoted colons in description)
python3 -c "import glob,yaml; [yaml.safe_load(open(p).read().split('---')[1]) for p in glob.glob('_docs/*.md')]; print('front matter OK')"

# 2. every chapter's part: matches a _parts part_name
#    (grep the part: values against _parts/*.md part_name values)

# 3. no stray Liquid in prose (only includes / relative_url are allowed)
grep -rn '{{' _docs/*.md | grep -v relative_url | grep -v 'include '

# 4. diagrams: SVG well-formed + Excalidraw JSON valid
python3 -c "import glob,xml.dom.minidom as m; [m.parse(f) for f in glob.glob('assets/diagrams/*.svg')]; print('svg OK')"
python3 -c "import glob,json; [json.load(open(f)) for f in glob.glob('assets/diagrams/*.excalidraw')]; print('excalidraw OK')"

# 5. run scripts parse (adjust the glob to your script name)
for d in examples/*/demo.sh; do bash -n "$d" || echo "SYNTAX: $d"; done
```

## The `unverified` discipline

If there is no real run in the authoring loop — no hardware, device, or live
service to execute the code against — then **no code is ever marked verified
from authoring alone.** Each chapter ends with a verification-status footer;
each example README has a verification-status section;
`_plans/reconciliation-plan.md` tracks every claim with an `unverified` default
and an iteration log. When in doubt, write the code as correctly as possible,
state the *specific* things a real run must confirm (API signatures, exact
versions, environment assumptions, anything that can't be checked statically),
and leave the status `unverified`. If there *is* a real run in the loop, promote
claims to verified only after that run passes — and record it in the plan.

## Packaging an iteration

```bash
find <project-dir> -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null
# clean other build artifacts too (target/, node_modules/, dist/, …) as relevant
tar -czf /mnt/user-data/outputs/<project>-rNN.x.tar.gz <project-dir>
# then present_files the tarball BEFORE the summary message
```

Use `ls -d examples/*/` for an authoritative example count (a tarball listing
under-counts directories whose names contain digits).
