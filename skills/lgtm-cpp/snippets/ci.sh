#!/usr/bin/env bash
# ci.sh - the full test matrix, run the same way locally and in CI.
# Four stages, each failing the whole run on the first failure:
#   1. default   build + ctest
#   2. asan      AddressSanitizer + UndefinedBehaviorSanitizer
#   3. tsan      ThreadSanitizer (its own binary; never shares with ASan)
#   4. coverage  instrumented build + llvm-cov, gated at a minimum percentage
#
# Running this locally reproduces exactly what the GitHub Actions workflow runs,
# so "green in CI" and "green on my machine" mean the same thing.
set -euo pipefail
cd "$(dirname "$0")"

MIN_COVERAGE="${MIN_COVERAGE:-90}"

echo "== 1/4 default lane =="
conan install . -of build -s build_type=Debug -s compiler.cppstd=23 --build=missing
cmake --preset default
cmake --build --preset default
ctest --preset default --output-on-failure

echo "== 2/4 asan-ubsan lane =="
cmake --preset asan-ubsan
cmake --build --preset asan-ubsan
ASAN_OPTIONS=abort_on_error=1:halt_on_error=1 \
UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1 \
  ctest --preset asan-ubsan --output-on-failure

echo "== 3/4 tsan lane =="
cmake --preset tsan
cmake --build --preset tsan
TSAN_OPTIONS=halt_on_error=1 ctest --preset tsan --output-on-failure

echo "== 4/4 coverage gate (minimum ${MIN_COVERAGE}% region) =="
MIN_COVERAGE="${MIN_COVERAGE}" ./coverage.sh

echo "== all stages passed =="
