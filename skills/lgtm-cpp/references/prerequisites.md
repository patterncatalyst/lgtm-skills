# Prerequisites

Complete toolchain for modern C++ (C++23) development on **Fedora 44, local tools
only**. There are no containers in this workflow. Install in this order.

## Version matrix (pinned, dated)

Re-verify the newest stable of each before a release and bump the pin, recording
the date next to it. Library versions (GoogleTest, spdlog, Boost, Lua) are pinned
in `conanfile.py`; tool versions come from Fedora or the upstream project.

| Tool | Pin | Verified |
|---|---|---|
| Clang / LLVM | 23.1.x (latest upstream stable; Fedora provides a recent line via `dnf`) | 2026-10-30 |
| clang tools | clang-tidy, clang-format, clangd (ship with the LLVM packages) | 2026-10-30 |
| CMake | 4.4.5 | 2026-10-30 |
| Ninja | latest Fedora (`ninja-build`) | 2026-10-30 |
| Conan | 2.32.0 | 2026-10-30 |
| C++ standard | C++23 (C++20 floor) | 2026-10-30 |
| GoogleTest + GoogleMock | 1.18.0 (Abseil pinned transitively by Conan) | 2026-10-30 |
| Logging | spdlog (survey + pin in `conanfile.py`) | 2026-10-30 |
| Scripting (embed) | Lua 5.5.1 (5.4.9 if a binding lags) + sol2 | 2026-10-30 |

Conan package versions are surveyed and pinned at project creation with
`conan search <name> -r conancenter`. Do not treat any version written into a
snippet as authoritative past its survey date; re-check and pin.

## 1. Compiler and Clang tools

Clang is the house compiler, and its tools (clang-tidy, clang-format, clangd) run
from the first build. One copy-pasteable block for Fedora 44:

```bash
sudo dnf install -y clang clang-tools-extra lld llvm compiler-rt libcxx libcxx-devel
clang --version          # Fedora ships a recent LLVM line
clang-tidy  --version
clang-format --version
clangd --version
```

`compiler-rt` provides the sanitizer runtimes (ASan/UBSan/TSan). `clang-tools-extra`
provides clang-tidy and clangd. GCC may be installed as a second-compiler
cross-check (`sudo dnf install -y gcc-c++`), but Clang is the default.

### Pinning the latest Clang when Fedora lags

Fedora's `clang` tracks the distro's LLVM line. When a project needs the newest
upstream Clang (23.1.x), install it from the LLVM project's packages or build, and
point CMake at it with `-DCMAKE_CXX_COMPILER=clang++` resolving to that install on
`PATH`. Record the compiler version the project is pinned to in the repo
(`CMakePresets.json` `cacheVariables` or a note next to the toolchain).

## 2. CMake and Ninja

```bash
sudo dnf install -y cmake ninja-build
cmake --version          # pin is 4.4.5
ninja --version
```

If Fedora's CMake is older than the pin, install the newest from Kitware or via
`pipx install cmake==4.4.5`, and prefer it on `PATH`.

## 3. Conan 2

Conan is the dependency manager. Install with pipx so it is isolated and pinned:

```bash
sudo dnf install -y pipx
pipx install "conan==2.32.0"
conan --version          # Conan 2.32.0
conan profile detect --force    # create a default profile from the detected toolchain
```

Edit the generated profile (`~/.conan2/profiles/default`) to pin Clang, libc++ or
libstdc++, and C++23:

```ini
[settings]
arch=x86_64
build_type=Release
compiler=clang
compiler.cppstd=23
compiler.libcxx=libstdc++11
compiler.version=<your clang major>
os=Linux
```

The default remote is Conan Center, which is free and needs no account.

## 4. Lua (companion scripting) and Python (external testing)

Lua is pulled per-project through Conan (`lua/5.5.1` plus `sol2` for embedding), so
no system install is required for the C++ build. A system `lua` CLI is handy for
running standalone scripts:

```bash
sudo dnf install -y lua          # optional: the standalone lua interpreter
```

Python appears only as an **external** test driver when a scenario needs one. Use a
project-local virtualenv, never a system-wide pip install:

```bash
python3 -m venv .venv && . .venv/bin/activate   # only if a project ships external tests
```

## 5. Git

```bash
sudo dnf install -y git
git --version
```

## 6. check-prereqs script

Drop `templates/check-prereqs.sh.template` into the project as
`scripts/check-prereqs.sh`. It exits non-zero on anything missing (clang, cmake,
conan, ninja, clang-tidy, clang-format on `PATH`, with version floors) so it is safe
to run as a CI gate or a first step in local setup.

```bash
install -m 0755 scripts/check-prereqs.sh scripts/check-prereqs.sh
./scripts/check-prereqs.sh
```

## 7. Editors

- **CLion.** Native CMake, Conan (plugin), and clangd support; runs on Linux.
- **VS Code** with the **clangd** and **CMake Tools** extensions. clangd reads
  `compile_commands.json` (CMake emits it with
  `CMAKE_EXPORT_COMPILE_COMMANDS=ON`), giving the same analysis both editors use.

Either way, every build, test, and run step is a CLI command (`cmake`, `ctest`,
`conan`). Do not rely on IDE-only actions; a contributor with only the toolchain and
a text editor must be able to follow along.

## Scaffolding a project

```bash
# From the repo root, drop in the snippets:
cp <skill>/snippets/CMakeLists.txt    CMakeLists.txt
cp <skill>/snippets/CMakePresets.json CMakePresets.json
cp <skill>/snippets/conanfile.py      conanfile.py
cp <skill>/snippets/.clang-format     .clang-format
cp <skill>/snippets/.clang-tidy       .clang-tidy

# Resolve dependencies and configure:
conan install . --output-folder=build --build=missing -s build_type=Debug
cmake --preset default
cmake --build --preset default
ctest --preset default --output-on-failure
```

## Verify everything

```bash
echo "=== compiler ===" && clang --version
echo "=== clang tools ===" && clang-tidy --version && clang-format --version && clangd --version
echo "=== build ===" && cmake --version && ninja --version
echo "=== deps ===" && conan --version
echo "=== prereq gate ===" && ./scripts/check-prereqs.sh
```

## Teardown

Local tools, nothing to stop or tear down between runs. To remove build output:

```bash
rm -rf build/                         # CMake build tree + Conan generated files
```

To clear the Conan package cache (rarely needed, forces a full re-download):

```bash
conan remove "*" --confirm            # wipe the local Conan cache
```

To remove the toolchain entirely: `sudo dnf remove clang clang-tools-extra cmake
ninja-build` and `pipx uninstall conan`.
