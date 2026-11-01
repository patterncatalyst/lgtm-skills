#!/usr/bin/env bash
# demo.sh - build and run one lane. Usage: ./demo.sh [test|build|asan|tsan]  (default: test)
#
# Each lane installs deps with Conan, configures with the matching CMake preset,
# builds, and runs CTest. ASan/UBSan and TSan are separate binaries (separate build
# dirs) and never share a build.
set -euo pipefail
cd "$(dirname "$0")"
lane="${1:-test}"

conan install . -of build -s build_type=Debug -s compiler.cppstd=23 --build=missing

case "$lane" in
  build)
    cmake --preset default
    cmake --build --preset default
    ;;
  test)
    cmake --preset default
    cmake --build --preset default
    ctest --preset default --output-on-failure
    ;;
  asan)
    cmake --preset asan-ubsan
    cmake --build --preset asan-ubsan
    ASAN_OPTIONS=abort_on_error=1:halt_on_error=1 \
    UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1 \
      ctest --preset asan-ubsan --output-on-failure
    ;;
  tsan)
    cmake --preset tsan
    cmake --build --preset tsan
    TSAN_OPTIONS=halt_on_error=1 ctest --preset tsan --output-on-failure
    ;;
  *)
    echo "usage: $0 [test|build|asan|tsan]" >&2
    exit 2
    ;;
esac
