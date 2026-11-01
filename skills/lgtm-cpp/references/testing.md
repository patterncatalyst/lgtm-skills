# Testing Infrastructure

Test strategy for C++ projects: **GoogleTest + GoogleMock** for the framework,
pulled through **Conan**, discovered by **CTest**, and exercised under **sanitizer
lanes**. No containers, so there is no Testcontainers layer; integration against real
infrastructure, when a project needs it, runs against locally installed services.

## Why GoogleTest and GoogleMock

- **GoogleTest** is the most widely used C++ test framework and integrates cleanly
  with CMake/CTest. It is the house framework for new C++ code.
- **GoogleMock is the deciding factor.** It is the only first-class, built-in C++
  mocking framework. Catch2 and doctest need an external mock library (FakeIt,
  Trompeloeil) to mock at all. For projects that mock — including teaching how to
  test design patterns, where seams and mocks are the point — gtest/gmock is the
  right default.
- Pin **`gtest/1.18.0`** in `conanfile.py`. 1.18 depends on Abseil; Conan pins
  Abseil (and RE2) transitively, so the dependency is a non-issue.

### The framework comparison (list these; use gtest/gmock)

| Framework | Mocking | Compile cost | House stance |
|---|---|---|---|
| **GoogleTest + GoogleMock** | built-in (gmock) | heaviest (gmock ~2s/file) | **default** |
| Catch2 | external (FakeIt/Trompeloeil) | moderate | alternative, worth naming |
| doctest | external | lightest (fastest compile) | alternative, worth naming |
| Boost.Test | external | moderate | may be *listed*, **not used** |

## Test target layout

```
src/
  shipping/           library under test
    rate_quote.hpp
    rate_quote.cpp
tests/
  rate_quote_test.cpp
CMakeLists.txt        library + app + test targets
```

The top-level `CMakeLists.txt` registers the test target and discovers its cases:

```cmake
enable_testing()
find_package(GTest REQUIRED)             # resolved from Conan's CMakeDeps

add_executable(unit_tests tests/rate_quote_test.cpp)
target_link_libraries(unit_tests PRIVATE shipping GTest::gtest_main GTest::gmock)

include(GoogleTest)
gtest_discover_tests(unit_tests
  XML_OUTPUT_DIR ${CMAKE_BINARY_DIR}/test-results)   # avoids races under parallel ctest
```

- Link **`GTest::gtest_main`** (provides `main()`) and **`GTest::gmock`**.
- Use **`gtest_discover_tests`**, not `add_test` per case — it enumerates cases at
  build time so CTest sees each one.
- Prefer **`XML_OUTPUT_DIR`** over `--gtest_output=xml` in `EXTRA_ARGS`: it avoids
  the race where parallel test shards clobber one XML file.

## Running tests

```bash
ctest --preset default --output-on-failure      # all tests, readable failures
ctest --preset default -R RateQuote             # by name regex
ctest --preset default -j"$(nproc)"             # parallel
ctest --preset default --repeat until-fail:50   # hunt a flaky test
```

## Sanitizers — a first-class lane

Borrowed from `lgtm-systems-programming`: **build/run success is a checkpoint, never
the finish line.** A test that passes under no sanitizer can still have a data race
or a lifetime bug. Run two extra lanes.

- **`asan-ubsan` is the default checked lane.** ASan (~2x slowdown) + UBSan (cheap)
  together catch memory errors and undefined behaviour.
- **`tsan` is a separate lane.** ThreadSanitizer is far more expensive and conflicts
  with ASan/UBSan — never combine them.

```bash
# default lane
conan install . -of build -s build_type=Debug --build=missing
cmake --preset asan-ubsan && cmake --build --preset asan-ubsan
ctest --preset asan-ubsan --output-on-failure

# concurrency lane, run alone
cmake --preset tsan && cmake --build --preset tsan
ctest --preset tsan --output-on-failure
```

### Route sanitizer findings into test failures

By default a sanitizer prints a report and the process may still exit 0, so a green
test can hide a real finding. Override the weak hooks so a finding fails the test:

```cpp
// link into the sanitizer test binary only
extern "C" void __asan_on_error()  { FAIL() << "AddressSanitizer reported an error"; }
extern "C" void __ubsan_on_report(){ FAIL() << "UBSan reported undefined behavior"; }
extern "C" void __tsan_on_report() { FAIL() << "ThreadSanitizer reported a data race"; }
```

Also set the runtime to abort on error as a backstop:

```bash
export ASAN_OPTIONS=abort_on_error=1:halt_on_error=1
export UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1
export TSAN_OPTIONS=halt_on_error=1
```

### Two gotchas to know

- **Death tests are unreliable under ASan.** `EXPECT_DEATH` / `EXPECT_EXIT` can fail
  with signal 4 before the body runs when the binary is built with ASan (a known
  GoogleTest issue). Run death tests in the `default` (non-ASan) lane, or guard them
  so they are skipped under ASan.
- **TSan has blind spots.** It cannot reason about lock-free algorithms built on raw
  `std::atomic` with `memory_order_relaxed`, and may miss races there. Treat passing
  N repeats as *evidence*, not *proof* — combine `--repeat` with varied scheduling,
  and verify the observable effect (counters, output), not just the exit code.

## clang-tidy: a test-scoped relaxation

`WarningsAsErrors: '*'` is right for the library under `src/`, but a few checks
fight GoogleTest/GoogleMock idioms, so test code gets a `tests/.clang-tidy` that
inherits the root config and disables them there only (`snippets/tests/.clang-tidy`):

- **`cppcoreguidelines-non-private-member-variables-in-classes`** — a fixture exposes
  state as protected members so `TEST_F` bodies can reach it; that is the framework's
  idiom. (Also covers a hand-written fake's public data member.)
- **`bugprone-unchecked-optional-access`** — a test guards a deref with
  `ASSERT_TRUE(opt.has_value())` before `*opt`, but clang-tidy cannot model that a
  gtest `ASSERT` returns on failure, so it flags the guarded access.
- **`bugprone-random-generator-seed`** — a deterministic test seeds its engine with a
  fixed constant on purpose; production code still gets the check.

A handful of other checks are best handled by writing the code the way they want,
not by disabling them: `readability-use-std-min-max` (use `std::min`/`std::max`, or
an early `return` where you want a visible branch); `performance-no-automatic-move`
(do not `const`-qualify a local you return by value); `readability-simplify-subscript-expr`
(use `v[i]`, not `v.data()[i]`); `modernize-use-nodiscard` (mark `const` query
methods `[[nodiscard]]`); `performance-enum-size` (give an enum a small base type).

## Coverage — llvm-cov source-based coverage

Clang's source-based coverage reports which lines, regions, and branches the suite
actually ran. It is **clang only**, so the coverage build forces `clang++`; a bare
`cmake` can default to gcc, which rejects the flags. It is a separate lane behind
`ENABLE_COVERAGE` (a `project_coverage` INTERFACE library, like the sanitizers), run
by `snippets/coverage.sh`:

```bash
./coverage.sh                 # full suite; gate at MIN_COVERAGE (default 90%)
MIN_COVERAGE=95 ./coverage.sh # raise the gate
```

The pipeline is four steps: compile with `-fprofile-instr-generate -fcoverage-mapping`,
run with `LLVM_PROFILE_FILE` set to emit a `.profraw`, `llvm-profdata merge` it, then
`llvm-cov report` (and `llvm-cov show -show-branches=count` to name the exact
uncovered branch). Branch coverage is the one to watch; it is the hardest to fool.
Treat coverage as a floor, not a target: a line that ran is not a line whose result
was asserted, so read an uncovered branch as a prompt to write a real assertion. For
several test binaries, give each a unique `LLVM_PROFILE_FILE` (use `%p`) and merge
them all into one `.profdata`. GCC's `--coverage` with `gcov`/`gcovr`/`lcov` is the
cross-check path; the LLVM pipeline is the primary one.

## CI — one matrix, local and in CI

`snippets/ci.sh` runs the whole matrix in order and fails on the first red stage:
the default lane, the `asan-ubsan` lane, the `tsan` lane, and the coverage gate.
`snippets/workflows/tests.yml` is the GitHub Actions translation: the three lanes as
a build matrix calling `demo.sh`, coverage as its own job calling `coverage.sh`. The
point is that the workflow is a thin wrapper around the same scripts a developer runs,
so "green in CI" and "green on my machine" mean the same thing.

- **ASan and TSan are separate jobs**, because they cannot share a binary — a
  two-pass matrix, never a combined sanitizer build.
- **Pin the toolchain** (Conan version, GoogleTest pin, and the compiler/CMake/Ninja
  versions) and cache `~/.conan2` keyed on `conanfile.py`, so a red build means a code
  change, not a drifting dependency.
- **`permissions: contents: read`** drops the token to what the checks need.
- Make the lane and coverage jobs **required to merge** to turn CI from a dashboard
  into a gate.
- `gtest_discover_tests(... XML_OUTPUT_DIR ...)` already writes JUnit-style XML that
  CI can surface as a test report.

A note on this skill's platform: the examples are verified locally on Fedora with a
pinned Clang. GitHub's hosted runners are Ubuntu with their own versions, so the
workflow either installs a matching Clang from the LLVM apt repositories or runs on a
self-hosted runner that already carries the toolchain; the pinning principle holds,
only the mechanism for getting the tools onto the runner changes.

## Pattern: plain unit test

```cpp
#include <gtest/gtest.h>
#include "shipping/rate_quote.hpp"

TEST(RateQuote, SumsLineItems) {
    shipping::RateQuote quote{{2, 3}};
    EXPECT_EQ(quote.total(), 5);
}

TEST(RateQuote, IsCommutative) {
    EXPECT_EQ(shipping::RateQuote({2, 3}).total(),
              shipping::RateQuote({3, 2}).total());
}
```

## Pattern: GoogleMock

gmock defines a mock with `MOCK_METHOD`, stubs with `ON_CALL`/`WillByDefault` or
`EXPECT_CALL`/`WillOnce`, and asserts interactions with `EXPECT_CALL`.

```cpp
#include <gmock/gmock.h>
#include <gtest/gtest.h>

using ::testing::_;
using ::testing::Return;

class CarrierGateway {
public:
    virtual ~CarrierGateway() = default;
    virtual int quote(std::string_view carrier, int weight) = 0;
};

class MockCarrierGateway : public CarrierGateway {
public:
    MOCK_METHOD(int, quote, (std::string_view carrier, int weight), (override));
};

TEST(Booking, PicksCheapestCarrier) {
    MockCarrierGateway gateway;
    EXPECT_CALL(gateway, quote("acme", 10)).WillOnce(Return(42));
    EXPECT_CALL(gateway, quote("globex", 10)).WillOnce(Return(39));

    shipping::Booking booking{gateway};
    EXPECT_EQ(booking.cheapest_quote(10), 39);
}
```

Notes:

- Mock only an interface you own (a pure-virtual seam). Testing design patterns — a
  Strategy, an Observer, a Decorator — is largely about mocking these seams; see
  `snippets/example_test.cpp`.
- `_` matches any argument; `Return`/`WillOnce` stub values; the `EXPECT_CALL`
  itself asserts the interaction happened.

## External tests in Python (only when needed)

For an end-to-end harness or data generation that is awkward in C++, a project may
ship an *external* Python driver in `tests/external/`, run from a project-local
venv. It drives the built binary as a black box; it is never a build or runtime
dependency of the C++. Keep it out of the CMake build; invoke it from a script or a
CTest `add_test` that calls the interpreter.

## Reading test failures with Claude Code

`ctest --output-on-failure` prints the failing assertion, and the app under test
writes to its rotating spdlog file (see `references/logging.md`). After a failing
run, Claude Code reads both: the CTest output for the assertion, and
`logs/<app>.log` for the surrounding application log lines. Sanitizer reports go to
stderr and, with `log_path` set in `ASAN_OPTIONS`, to a file too.
