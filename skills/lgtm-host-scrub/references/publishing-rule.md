# Keeping a repository clean after the scrub

Scrubbing once is not enough: the next benchmark log, profile dump or pasted command
brings the values back. Three pieces stop that.

## 1. The rule in the project's CLAUDE.md

Paste and adapt. Name the generic phrasing the project uses for the CPU, so prose and
generated files agree.

```markdown
## Publishing rule: nothing identifies the machine or its owner
The repo is public, so no tracked file may name the development machine, its owner
or anything that helps locate or attack it later:
- No absolute home-directory path (under /home or /Users), no account name, no hostname.
  Write `<repo>/...` or `~/...`.
- No laptop model (DMI `product_name` is `"redacted"`), no CPU model or model number. The
  CPU is a class ("Intel 8-core/16-thread laptop CPU"); prose names its properties
  (SMT, cache sizes, frequency driver), never the part.
- No host kernel build number or build date: give `major.minor` and the preempt model.
- No `/etc/machine-id`, DMI serial or UUID, MAC or IP address, `root=UUID=` or BOOT_IMAGE.
- Generated output is scrubbed before it is committed: `host_ids.py scrub <dir>` on a
  results directory, `host_ids.py filter` on a captured log.
- `host_ids.py check` runs in CI and fails the build on a hit.
```

## 2. Generators that never record the values

The scrub is a backstop; the better fix is in the code that writes the file:

- A machine profile records the CPU vendor and topology (cores, threads, cache sizes,
  line size from `/sys/devices/system/cpu/cpu0/cache/`), not `model name`.
- Kernel: `uname -r | grep -oE '^[0-9]+\.[0-9]+'` plus the preempt model from
  `uname -v`, never the whole string. `perf --version` prints the full kernel build.
- Paths: print relative to the repository root, or with `$HOME` replaced by `~`.
- Never dump `/proc/cmdline` (root UUID, BOOT_IMAGE), `ip link` (MACs), `hostnamectl`
  or `dmidecode` into a committed file.
- A run script can call `host_ids.py scrub "$RESULTS_DIR"` in an `EXIT` trap, so every
  results directory is scrubbed even when the run fails.

## 3. The CI check

`host_ids.py check` works on a CI runner: with `CI=true` (or `GITHUB_ACTIONS` set) it
skips the literal rules for the machine it runs on, since a runner's hostname, DMI
product ("Virtual Machine") and kernel are a cloud VM's and would flag ordinary words.
Its generic patterns still catch a developer's home path, CPU part number, kernel build,
DMI product, root UUID or BOOT_IMAGE in any tracked file. Copy the script into the
repository (for example `scripts/host_ids.py`) so CI does not depend on the skill:

```yaml
  host-ids:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.1
      - run: python3 scripts/host_ids.py check
```

With branch protection, make the summary job (`ci-ok`) depend on it rather than
requiring `host-ids` itself (see lgtm-github §6).

The check prints `path:line: category` without the value, so the CI log does not
republish what it found. Fix a hit locally with `host_ids.py scrub`; if the hit is
legitimate (a dependency pin that looks like a kernel build, a lab VM's own kernel,
a test fixture of fake values), allow it by path and category in `.host-scrub.toml`
or list the file under `skip`.

## Things the tool cannot know

Values that are not discoverable at run time: an old hostname, a previous account, a
work email in a sample config, a home network's IP range, a serial number only root
can read. Put them in the untracked extra-literals file
(`~/.config/host-scrub/extra.txt`, or `$HOST_SCRUB_EXTRA`), one per line as `value`
or `value==>replacement`. Never commit that file, and never write these values into a
committed rule table, not even split into pieces (`"/ho" + "me"` still publishes both
halves).
