# MCP servers for C++ development

The honest situation, stated plainly. Unlike `lgtm-quarkus` (which pairs with the
Quarkus Agent MCP) and `lgtm-camel` (the Apache Camel MCP), **there is no
dev-assistant MCP server for C++** at that level. Nothing scaffolds, builds, runs,
and inspects a running C++ program the way the Quarkus Agent MCP does. Keep the C++
toolchain **CLI-based**: `conan install`, `cmake`, `ctest`, `clang-tidy`.

## The real machine assistance: clangd (LSP, not MCP)

The closest thing to an "agent" for C++ is **clangd**, the LLVM language server. It
is not an MCP server, but it is what gives both CLion and VS Code (and a CLI tool)
accurate code intelligence: diagnostics, go-to-definition, cross-references, and
clang-tidy integration, all from the real compiler front end.

clangd reads **`compile_commands.json`**, which CMake emits when
`CMAKE_EXPORT_COMPILE_COMMANDS=ON` (the top-level `CMakeLists.txt` sets it). Point
clangd at the build directory and it analyzes the project exactly as the compiler
sees it:

```bash
# build/ contains compile_commands.json after a configure
clangd --compile-commands-dir=build
```

This is the authoritative source of "what does the compiler think of this code" — use
it over guessing.

## Authoritative documentation

For C++ language and library questions, the authoritative sources are:

- **cppreference.com** — the de-facto standard-library and language reference.
- The **ISO C++ standard** (and the working draft) for exact wording.
- **Compiler docs** — the Clang and libc++/libstdc++ documentation for
  implementation specifics, flags, and sanitizer behaviour.
- **Conan Center** (`conan search`, conan.io) for package versions and recipes.

Check these first, not blog posts.

## Summary

| Need | Tool |
|---|---|
| Scaffold, configure, build, test | `conan` + `cmake` + `ctest` CLI |
| Code intelligence / diagnostics | **clangd** (LSP), via `compile_commands.json` |
| Static analysis | `clang-tidy` (through CMake or `run-clang-tidy`) |
| Formatting | `clang-format` |
| Language / library docs | cppreference, the ISO standard, compiler docs |
| Package search | `conan search <name> -r conancenter` |
| Quarkus-Agent-style dev MCP | does not exist for C++ |
