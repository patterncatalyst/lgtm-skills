#!/usr/bin/env bash
# Verify the C++ toolchain is present. Exits non-zero on anything missing, so it
# is safe as a CI gate or the first step in local setup.
#
#   ./scripts/check-prereqs.sh
#
# Platform: Fedora, local tools only, no containers. See references/prerequisites.md.
set -euo pipefail

missing=0
note() { printf '  %s\n' "$*"; }
fail() { printf '  MISSING: %s\n' "$*" >&2; missing=1; }

# require <command> <install hint>
require() {
  if command -v "$1" >/dev/null 2>&1; then
    note "$1: $("$1" --version 2>&1 | head -n1)"
  else
    fail "$1 not on PATH ($2)"
  fi
}

echo "Checking C++ toolchain prerequisites..."

require clang        "sudo dnf install -y clang"
require clang++      "sudo dnf install -y clang"
require clang-tidy   "sudo dnf install -y clang-tools-extra"
require clang-format "sudo dnf install -y clang-tools-extra"
require clangd       "sudo dnf install -y clang-tools-extra"
require cmake        "sudo dnf install -y cmake (pin 4.4.5)"
require ninja        "sudo dnf install -y ninja-build"
require conan        "pipx install conan==2.32.0"
require git          "sudo dnf install -y git"

# ── CMake version floor (>= 3.25 for presets v6; pin is 4.4.5) ────────────────
if command -v cmake >/dev/null 2>&1; then
  cmake_ver="$(cmake --version | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo 0.0.0)"
  cmake_major="${cmake_ver%%.*}"; rest="${cmake_ver#*.}"; cmake_minor="${rest%%.*}"
  if [ "$cmake_major" -lt 3 ] || { [ "$cmake_major" -eq 3 ] && [ "$cmake_minor" -lt 25 ]; }; then
    fail "cmake $cmake_ver is below the 3.25 floor (install 4.4.5)"
  fi
fi

# ── Conan major version (needs Conan 2) ───────────────────────────────────────
if command -v conan >/dev/null 2>&1; then
  conan_major="$(conan --version | grep -oE '[0-9]+' | head -n1 || echo 0)"
  [ "$conan_major" -ge 2 ] || fail "conan major $conan_major, need 2 (pipx install conan==2.32.0)"
fi

echo
if [ "$missing" -ne 0 ]; then
  echo "Prerequisites incomplete. See references/prerequisites.md." >&2
  exit 1
fi
echo "All prerequisites present."

# ── Teardown note ────────────────────────────────────────────────────────────
# Local tools only, nothing to stop between runs. To clean build output:
#   rm -rf build/
# To clear the Conan cache (forces a full re-download):
#   conan remove "*" --confirm
