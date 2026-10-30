---
name: lgtm-cpp
description: Scaffold a modern C++ (C++23, C++20 floor) project with a full dev toolchain on Fedora, local tools only, no containers. Clang + clang tools (clang-format, clang-tidy, clangd), CMake 4.4.5 with CMakePresets, Conan 2.32.0 for dependencies, GoogleTest + GoogleMock 1.18.0 for tests (via Conan, Abseil pinned), Ninja builds, ASan/UBSan and TSan sanitizer lanes, spdlog console + rotating file logging for Claude, Lua for companion scripting, Python for external testing only, and a check-prereqs script. Use whenever starting a new C++ project, setting up C++ dev prerequisites, or wiring up test infrastructure. Also triggers for "new C++ project", "set up C++", "C++ prerequisites", "CMake + Conan setup", "GoogleTest setup", "gtest/gmock", or any request combining C++ with testing, sanitizers, or logging scaffolding. The C++ sibling of lgtm-quarkus, lgtm-spring-boot, lgtm-python, and lgtm-csharp.
---

# lgtm-cpp Skill

A skill that scaffolds a modern C++ project with a complete development
toolchain, from prerequisites through structured logging for Claude Code and a
layered test framework with sanitizers. It is the C++ sibling of `lgtm-quarkus`,
`lgtm-spring-boot`, `lgtm-python`, and `lgtm-csharp`.

The output is a project-ready setup: prerequisites verified, Clang and its tools
pinned, dependencies resolved through Conan, warnings-as-errors and the Clang
tools on from the first build, logging wired for AI-assisted diagnosis, and test
infrastructure scaffolded with GoogleTest/GoogleMock and sanitizer lanes.
Everything builds with CMake + Ninja on the local machine.

## Platform policy: Fedora, local tools, no containers

This skill targets **Fedora 44 with local tools only**. There are no containers
anywhere in the workflow. It does not emit a `Containerfile` or `Dockerfile`, and
it does not reach for a container runtime. This matches `lgtm-csharp`: pure
language and tooling material does not need a container. State this plainly to the
user when they expect a container path: there is not one here.

Other platform rules that follow from local-only:

- **Editors are CLion and VS Code.** Both drive the same CMake + Conan + Clang
  toolchain underneath. VS Code uses the clangd and CMake Tools extensions; CLion
  has native CMake and clangd support. Every build, test, and run step is a CLI
  command (`cmake`, `ctest`, `conan`), so a contributor with only the toolchain and
  a text editor can follow along. Do not rely on IDE-only actions.
- **Case-sensitive filesystem, `/` path separators, LF line endings.** The
  `.clang-format` and `.editorconfig` pin LF.

## When to use this skill

Use whenever the user is:

- **Starting a new C++ project** and needs the full toolchain from scratch.
- **Setting up prerequisites** for an existing C++ project (Clang, CMake, Conan,
  Ninja, clang tools).
- **Setting up test infrastructure** (GoogleTest + GoogleMock via Conan, CTest
  with `gtest_discover_tests`, ASan/UBSan and TSan lanes).
- **Adding structured logging** (spdlog console + rotating file) for post-run
  AI-assisted diagnosis.
- **Enforcing analysis and style** with clang-tidy, clang-format, and
  warnings-as-errors.
- **Embedding a scripting layer** — Lua is the house choice (see below).

## What the skill does NOT do

- It does not produce a container image. No `Containerfile`, no Dockerfile. The
  platform is local tools on Fedora.
- It does not scaffold Kubernetes or an OpenShift path. When a project later needs
  one, pair with `lgtm-minikube-stack` or `lgtm-crc`.
- It does not scaffold an observability stack (Grafana, Loki, Tempo, Mimir).
  Example apps log to the console and to a rotating file. See
  `references/logging.md`.
- It does not produce tutorial prose or documentation sites. Pair with
  `lgtm-jekyll` or `lgtm-tutorial`.
- It does not install the toolchain itself. It produces the commands and verifies
  they succeed. The user runs the installs.

## Workflow

When invoked, do this in order:

1. **Check prerequisites.** Verify or guide installation of each tool. Use
   `references/prerequisites.md` for the full checklist and install commands, and
   drop in `templates/check-prereqs.sh.template` as `scripts/check-prereqs.sh`.

2. **Scaffold or update the project.** Create the CMake layout with a top-level
   `CMakeLists.txt`, `CMakePresets.json`, and a `conanfile.py`. Add `.clang-format`
   and `.clang-tidy` at the repo root so style and analysis apply from the first
   build. Use `references/dependencies.md`.

3. **Wire up logging.** Add spdlog console output plus a rotating file sink so
   Claude Code can read logs after a crash or test failure. Use
   `references/logging.md`.

4. **Wire up testing.** Add a GoogleTest/GoogleMock test target discovered by CTest
   with `gtest_discover_tests`, plus the sanitizer build presets. Use
   `references/testing.md` and the snippets.

5. **Generate CLAUDE.md** if new project. Include project-specific context for
   Claude Code. Use `templates/CLAUDE.md.template`.

## Dependency and platform policy (non-negotiable)

- **Upstream, latest stable, pinned.** Always promote the upstream project's latest
  stable release (never a prerelease), surveyed upstream at the start of work, and
  pin it exactly in `conanfile.py` (or the `CMakePresets`/toolchain where a tool is
  not a Conan package). Step back only for an actual incompatibility, and record the
  hold and its reason next to the pin. A "newer than supported" warning is not, on
  its own, a reason to step back. Never a floating version or a `[>=x]` range that
  resolves to whatever is newest at install time.
- **Maintained open source first.** Before adding any library or tool, look for a
  maintained open-source option: an open license, recent releases, and no fees or
  license keys. An archived or unmaintained project is not an option; say so and
  pick a maintained one.
- **No fees, no license keys, no accounts.** Every library and tool must be usable
  for free by anyone who clones the project. Clang, CMake, Conan, Ninja,
  GoogleTest, spdlog, Lua, Boost, Catch2, and doctest are all open source. The
  default Conan remote (Conan Center) is free and needs no account.
- **No vendor cloud components unless the user decides otherwise.** Do not bring
  AWS, Google Cloud, or Azure SDKs into examples or recommended solutions unless the
  user has explicitly decided to. Describe the capability generically and implement
  it with open-source components.
- **Prefer CNCF and vendor-neutral standards.** When options compete and a project
  later needs them, prefer OpenTelemetry (its C++ SDK) and other vendor-neutral
  open source.

## Key principles (always apply)

- **CMake + Ninja is the build system; Conan is the dependency manager.** Configure,
  build, and test through CMake presets that consume the Conan-generated toolchain.
  No hand-maintained `find_package` hunts for system libraries, no `FetchContent` as
  the primary path. `FetchContent` and distro `-devel` packages are documented as
  *alternatives*, never the build path.

- **Clang is the compiler; the Clang tools are always on.** clang-tidy and
  clang-format run from the first build, driven by a repo-root `.clang-tidy` and
  `.clang-format`. clangd is the language server both CLion and VS Code use. GCC may
  be used as a second-compiler cross-check, but Clang is the house default.

- **C++23, with C++20 as the floor.** Set `CMAKE_CXX_STANDARD 23`,
  `CMAKE_CXX_STANDARD_REQUIRED ON`, `CMAKE_CXX_EXTENSIONS OFF`. There is no C++21 —
  never write it. Drop to C++20 only for an actual toolchain gap, recorded next to
  the setting.

- **Warnings are errors.** `-Wall -Wextra -Wpedantic -Werror` (plus
  `-Wshadow -Wconversion` where the code tolerates it) on every target, set once in
  the top-level `CMakeLists.txt`. A warning fails the build rather than reaching a
  test.

- **GoogleTest + GoogleMock for tests, via Conan, discovered by CTest.** gtest is
  the house framework; gmock is the deciding reason (it is the only first-class
  built-in C++ mock). Pull both from Conan, register with
  `gtest_discover_tests(...)`, and run with `ctest`. **Catch2, doctest, and
  Boost.Test** are the named alternatives worth *listing* in a comparison, but the
  house default is gtest/gmock. **Boost.Test is not used.** See
  `references/testing.md`.

- **GoogleTest 1.18.0, Abseil pinned.** 1.18 takes a dependency on Abseil; Conan
  pins Abseil (and RE2) transitively, so the Abseil dependency is a non-issue here.
  Pin `gtest/1.18.0` in `conanfile.py`.

- **Sanitizers are a first-class build lane, not an afterthought.** Ship an
  `asan-ubsan` preset (ASan + UBSan together) and a separate `tsan` preset (TSan is
  far more expensive and conflicts with the others — never combine them). Route
  sanitizer findings into test failures by overriding the weak hooks
  (`__asan_on_error`, `__ubsan_on_report`, `__tsan_on_report` → fail). Borrow the
  verification discipline from `lgtm-systems-programming`: **a build that runs
  without error but produces none of its claimed effect is still broken** — verify
  the effect, not the exit code. See `references/testing.md`.

- **Structured file logging is non-negotiable for AI-assisted development.** The app
  logs through **spdlog** to a rotating file that Claude Code can read after a crash
  or test failure, in addition to the console. Console output alone scrolls away and
  cannot be grep'd by an agent post-mortem. See `references/logging.md`.

- **Lua for companion scripting; Python for external testing only.** When a project
  needs an embedded or companion scripting layer, the house choice is **Lua** (embed
  with `sol2` over the Lua C API). **Python** appears only as an *external* test
  driver when a scenario genuinely needs it (end-to-end harnesses, data generation);
  it is never a build or runtime dependency of the C++ itself.

- **Idiomatic modern C++.** Favour the standard library and the active language
  edition over hand-rolled machinery: RAII and smart pointers over raw `new`/`delete`,
  `std::span`/`std::string_view` for non-owning views, ranges and `std::expected`
  where they clarify, `enum class`, `constexpr`, and `[[nodiscard]]`. Run
  `lgtm-idiomatic-review` (C++23 rules) before release.

- **No containers.** This is the platform decision, not an omission. There is no
  Containerfile template. Example apps run from the build tree and tests run with
  `ctest`, both on the local machine.

## Reference files

Read these as needed, not preemptively:

- `references/prerequisites.md` - Fedora 44 toolchain install (one copy-pasteable
  block), the pinned and dated version matrix, the check-prereqs script, editor
  setup (CLion / VS Code), and teardown.
- `references/dependencies.md` - Conan 2 workflow, the `conanfile.py`, the top-level
  `CMakeLists.txt` and `CMakePresets.json`, common libraries by shape (spdlog, Boost,
  Lua/sol2, nlohmann_json, OpenTelemetry C++), `.clang-tidy`, `.clang-format`, and
  warnings-as-errors.
- `references/testing.md` - GoogleTest + GoogleMock patterns, `gtest_discover_tests`
  and CTest, the ASan/UBSan and TSan lanes, the sanitizer-to-failure hooks, the
  death-test-under-ASan gotcha, and the framework comparison (gtest vs Catch2 vs
  doctest vs Boost.Test).
- `references/logging.md` - spdlog console and rotating-file logging for example
  apps, for Claude Code diagnosis. No observability stack, no containers.
- `references/mcp-servers.md` - the honest MCP situation: there is no C++
  dev-assistant MCP like the Quarkus Agent; clangd (LSP) is the real machine
  assistance, and cppreference plus the ISO standard and compiler docs are
  authoritative.

## Snippets

Drop-in reusable patterns:

- `snippets/CMakeLists.txt` - top-level build: C++23, warnings-as-errors, Conan
  toolchain, sanitizer options, `enable_testing()`, a library + app + test target.
- `snippets/CMakePresets.json` - `default`, `asan-ubsan`, `tsan`, and `release`
  presets wired to the Conan toolchain and Ninja.
- `snippets/conanfile.py` - pinned deps (gtest 1.18.0, spdlog, etc.) and the
  `CMakeToolchain` + `CMakeDeps` generators.
- `snippets/.clang-format` - house style, LF line endings.
- `snippets/.clang-tidy` - the enabled check set, warnings-as-errors for analysis.
- `snippets/example_test.cpp` - GoogleTest + GoogleMock (`TEST`, `TEST_F`,
  `MOCK_METHOD`, `EXPECT_CALL`) against a small shipping-domain example.

## Templates

- `templates/CLAUDE.md.template` - project CLAUDE.md for C++: CMake/Conan/ctest
  commands, sanitizer lanes, Clang tools, no containers.
- `templates/check-prereqs.sh.template` - exits non-zero on anything missing (clang,
  cmake, conan, ninja, clang-tidy, clang-format on PATH, with version floors).

## Multi-step work → `lgtm-relay`

For non-trivial projects (a library plus an app plus a test suite, or a multi-target
build), use `lgtm-relay`: Opus plans the project and test layout, Sonnet scaffolds
and wires everything, Opus validates against a real `cmake --build` and `ctest` run
across the default and sanitizer presets.
