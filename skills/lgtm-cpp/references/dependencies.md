# Dependencies, build settings, and analysis

The dependency manager is **Conan 2**; the build system is **CMake + Ninja**. Conan
resolves and pins libraries, generates a CMake toolchain, and CMake consumes it
through presets. Survey the latest stable with `conan search <name> -r conancenter`
before pinning. No containers are involved anywhere here.

## The Conan + CMake handshake

Conan generates two things CMake consumes:

- **`CMakeToolchain`** → `conan_toolchain.cmake`, which `CMakePresets.json` points at
  through `CMAKE_TOOLCHAIN_FILE`. It carries the compiler, C++ standard, and build
  type.
- **`CMakeDeps`** → `<Pkg>Config.cmake` files, so plain `find_package(GTest)` /
  `find_package(spdlog)` resolve the Conan-installed libraries.

The flow, per build type:

```bash
conan install . --output-folder=build --build=missing -s build_type=Debug
cmake --preset default           # reads conan_toolchain.cmake
cmake --build --preset default
```

This is the house path. `FetchContent` (CMake downloads and builds the source) and
Fedora `-devel` packages (`find_package` against system libraries) are documented as
**alternatives** — useful to show a reader — but they are not the build path.

## conanfile.py (pin everything)

See `snippets/conanfile.py`. It pins each dependency exactly and declares the two
generators. The headline pin:

```python
def requirements(self):
    self.requires("gtest/1.18.0")        # GoogleTest + GoogleMock; Abseil pinned transitively
    self.requires("spdlog/__PINNED__")   # survey + pin: conan search spdlog -r conancenter
    # add per project, each pinned:
    # self.requires("boost/__PINNED__")
    # self.requires("lua/5.5.1"); self.requires("sol2/__PINNED__")
    # self.requires("nlohmann_json/__PINNED__")
```

- **GoogleTest `1.18.0`.** 1.18 depends on Abseil; Conan pins Abseil (and RE2)
  transitively, so there is nothing to manage by hand. Pin exactly, never a range.
- Never a Conan version range (`[>=1.0]`) for a house dependency — it resolves to
  whatever is newest at install time and breaks reproducibility. Pin the exact
  version and bump deliberately.

## Shared build settings: top-level CMakeLists.txt

See `snippets/CMakeLists.txt`. It sets, once, for every target:

- `CMAKE_CXX_STANDARD 23`, `CMAKE_CXX_STANDARD_REQUIRED ON`,
  `CMAKE_CXX_EXTENSIONS OFF` — C++23, no compiler extensions, no silent fallback.
- `CMAKE_EXPORT_COMPILE_COMMANDS ON` — emits `compile_commands.json` for clangd and
  clang-tidy (both editors and CI read it).
- Warnings-as-errors: `-Wall -Wextra -Wpedantic -Werror` (add `-Wshadow
  -Wconversion` where the code tolerates them).
- clang-tidy wired through `CMAKE_CXX_CLANG_TIDY` so analysis runs on every
  compile, gated behind a cache option so a one-off fast build can skip it.
- A sanitizers option consumed by the `asan-ubsan` and `tsan` presets.

## CMakePresets.json (the build matrix)

See `snippets/CMakePresets.json`. Four configure presets, each wired to the Conan
toolchain and the Ninja generator:

| Preset | Build type | Sanitizers | Use |
|---|---|---|---|
| `default` | Debug | none | day-to-day build + test |
| `asan-ubsan` | Debug | ASan + UBSan | the default checked lane |
| `tsan` | Debug | ThreadSanitizer | concurrency lane, **run alone** |
| `release` | Release | none | optimized build, benchmarks |

Never combine TSan with ASan/UBSan — they conflict and the run is meaningless. See
`references/testing.md` for the sanitizer discipline.

## Style and analysis: .clang-format and .clang-tidy

Place `snippets/.clang-format` and `snippets/.clang-tidy` at the repo root.

- **`.clang-format`** pins the house style (based on LLVM style, 4-space indent,
  100-column limit, LF line endings). `clang-format -i` reformats; CI verifies with
  `clang-format --dry-run --Werror`.
- **`.clang-tidy`** enables the `bugprone-*`, `performance-*`, `modernize-*`,
  `readability-*`, `cppcoreguidelines-*`, and `clang-analyzer-*` check families and
  sets `WarningsAsErrors` so a lint finding fails the build. Run through CMake
  (`CMAKE_CXX_CLANG_TIDY`) or standalone:

```bash
clang-format --dry-run --Werror $(git ls-files '*.cpp' '*.hpp')   # CI style gate
run-clang-tidy -p build                                           # analysis over the tree
```

## Core libraries by shape

Survey and pin each at project creation. All are open source and free.

| Need | Library | Notes |
|---|---|---|
| Logging | `spdlog` | console + rotating file; see `references/logging.md` |
| JSON | `nlohmann_json` | header-only, ergonomic |
| General utilities | `boost/__PINNED__` | **latest** Boost only; **not Boost.Test** (see testing.md) |
| Embedded scripting | `lua/5.5.1` + `sol2` | Lua is the house scripting choice; sol2 is the C++ binding |
| HTTP/gRPC (when needed) | `grpc`, `protobuf` or `cpp-httplib` | pin exactly; prefer vendor-neutral |
| Telemetry (when needed) | `opentelemetry-cpp` | CNCF, vendor-neutral |

**Boost policy:** Boost is allowed as long as the **latest** Boost libraries are
used. The one exception is **Boost.Test** — it is *not* the house test framework
(gtest/gmock is). Boost.Test may be *listed* as an alternative in a comparison, but
not used.

## Package discovery

```bash
conan search spdlog -r conancenter          # list available versions to pin
conan graph info . --format=html > deps.html  # inspect the resolved dependency graph
conan list "*" --cache                       # what is in the local cache
```
