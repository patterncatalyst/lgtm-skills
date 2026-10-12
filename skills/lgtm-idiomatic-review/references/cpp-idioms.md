# C++ idioms

Idiomatic C++23 for example and tutorial code, with the libraries this collection
uses: Drogon (HTTP), librdkafka C++ API (Kafka), libpq (PostgreSQL), spdlog
(logging), CMake and Conan 2 (build). Authority: `lgtm-systems-programming`
(behavioral verification, safe signal and shutdown handling), `lgtm-docker-stack`
(`snippets/instrumentation-cpp.md`), cppreference, the C++ Core Guidelines, and
each library's own docs. Severity tiers match the SKILL: **reinvented** >
**deprecated** > **structure** > **style**.

The guiding rule: ownership is expressed in types. Every resource (memory, a
`PGconn`, a `PGresult`, a Kafka handle, a thread) has exactly one owner that
releases it in a destructor, and the standard library or the framework already
ships the utility the example is tempted to write.

## RAII and smart pointers, no naked `new` / `delete` (structure)

`std::make_unique` / `std::make_shared` and RAII wrappers instead of `new` and a
matching `delete` on every path. The rule of zero follows: a class whose members
manage themselves declares no destructor, copy, or move operations.

```cpp
// before — leaks on the early return
auto* consumer = RdKafka::KafkaConsumer::create(conf, errstr);
if (!consumer) return 1;
...
delete consumer;

// after
std::unique_ptr<RdKafka::KafkaConsumer> consumer{RdKafka::KafkaConsumer::create(conf.get(), errstr)};
if (!consumer) { spdlog::error("kafka consumer: {}", errstr); return 1; }
// on shutdown: consumer->close(); the unique_ptr deletes it
```

C callbacks that take an opaque pointer are the legitimate handoff: create with
`std::make_unique`, `release()` at the call that transfers ownership, and re-adopt
it in the callback with `std::unique_ptr<T>{static_cast<T*>(opaque)}`. A comment
naming the owner at each handoff is required.

## libpq behind RAII, parameters through `PQexecParams` (reinvented / structure)

Wrap `PGconn` and `PGresult` in `std::unique_ptr` with `PQfinish` / `PQclear`
deleters so every exit path clears the result. Pass values as parameters; never
build SQL by string concatenation.

```cpp
// before
std::string sql = "INSERT INTO orders VALUES ('" + id + "', '" + sku + "')";
PGresult* r = PQexec(conn, sql.c_str());
if (PQresultStatus(r) != PGRES_COMMAND_OK) return false;   // r leaks
PQclear(r);

// after
using PgResult = std::unique_ptr<PGresult, decltype(&PQclear)>;
const char* params[] = {id.c_str(), sku.c_str()};
PgResult r{PQexecParams(conn, "INSERT INTO orders (id, sku) VALUES ($1, $2)",
                        2, nullptr, params, nullptr, nullptr, 0), &PQclear};
if (PQresultStatus(r.get()) != PGRES_COMMAND_OK) return std::unexpected(PQerrorMessage(conn));
```

libpq has no pool, so a small RAII pool with a scoped checkout is legitimate here.

## Signal handling: async-signal-safe store, work elsewhere (structure)

A signal handler may only do async-signal-safe work: store to a lock-free
`std::atomic<bool>` (or `volatile std::sig_atomic_t`). Logging, allocation,
locking, and `app().quit()` happen on a normal thread that observes the flag.
With Drogon, install the handler through `app().setTermSignalHandler(...)` rather
than re-installing `std::signal` inside `registerBeginningAdvice`; Drogon invokes
that callback from signal context, so its body is the same single atomic store.
Run the watcher as a `std::jthread` and stop it through its `std::stop_token`
instead of a second hand-kept stop flag.

```cpp
// before — logging and quit() inside the handler
void on_term(int) { spdlog::info("SIGTERM"); app().quit(); }
std::signal(SIGTERM, on_term);

// after
std::atomic<bool> g_stopping{false};
static_assert(std::atomic<bool>::is_always_lock_free);
app().setTermSignalHandler([] { g_stopping.store(true, std::memory_order_release); });

std::jthread watcher{[](std::stop_token st) {
    while (!st.stop_requested() && !g_stopping.load(std::memory_order_acquire))
        std::this_thread::sleep_for(50ms);
    if (st.stop_requested()) return;
    spdlog::info("SIGTERM received, draining");
    /* pre-stop delay, wait for in-flight, then */ app().quit();
}};
```

## Use what Drogon already provides (reinvented)

- UUIDs: `drogon::utils::getUuid()`, not a hand-rolled `mt19937` hex formatter.
- JSON: `req->getJsonObject()` and `HttpResponse::newHttpJsonResponse(Json::Value)`,
  not string-built JSON.
- Routing: an `HttpController<T>` with `METHOD_LIST_BEGIN` / `ADD_METHOD_TO`, or
  `app().registerHandler(path, fn, {Get})` for a small service. Paths and methods
  are declared, not parsed in a handler.
- Shutdown: `app().quit()` stops the listeners and returns from `app().run()`.
- Handlers run on Drogon's I/O loop threads; a blocking libpq or Kafka call there
  stalls every connection on that loop. Size `setThreadNum` for it or offload,
  and note which the example chose.

## Errors as values: `std::expected` and `std::optional` (structure)

Return `std::expected<T, E>` for operations that fail in expected ways (a missing
row, a rejected message) and `std::optional<T>` for "maybe absent". Sentinel
values (`-1`, empty string), `bool` plus out-parameter, and exceptions for control
flow are the before. Exceptions remain right for broken invariants and at
library boundaries that throw.

```cpp
// before
bool find_order(const std::string& id, Order& out);

// after
std::expected<Order, DbError> find_order(std::string_view id);
```

## Views and formatting (style / structure)

- Take `std::string_view` and `std::span<const T>` for read-only parameters
  instead of `const std::string&` / pointer-plus-length pairs.
- Format with `std::format` / `std::print` (`<print>`), and log through spdlog,
  which uses the same `{}` syntax. `std::ostringstream` chains, `sprintf`, and
  `std::cerr <<` logging in service code are findings; `strcpy`/`sprintf`/`gets`
  are `ban`.
- Algorithms and ranges (`std::ranges::sort`, `views::filter`,
  `std::ranges::to<std::vector>()`) over index loops that copy by hand.
- `const` by default, `constexpr` for compile-time constants, `enum class`
  over plain enums.

## Headers (style)

`#pragma once` or include guards; include what you use; no `using namespace std;`
(or any `using namespace` at namespace scope) in a header, where it leaks into
every includer. A `using namespace` inside a function body is fine.

## Build: target-based CMake, Conan 2 lockfile, sanitizers (structure)

- Per-target commands: `target_link_libraries`, `target_include_directories`,
  `target_compile_options`, `target_compile_features(app PRIVATE cxx_std_23)`.
  Directory-scoped `include_directories`, `link_libraries`, and `add_definitions`
  leak into every target.
- Dependencies come from Conan 2 with exact pins (`conanfile.py`) and a committed
  lockfile: `conan lock create .`, then `conan install . --lockfile=conan.lock`.
  `CMakeDeps` + `CMakeToolchain` generators, `find_package(... CONFIG REQUIRED)`.
- A Debug or CI configuration with `-fsanitize=address,undefined` (and a separate
  `thread` run for concurrent code), plus `-Wall -Wextra -Wpedantic`.

## librdkafka C++ API (structure)

Own handles with `std::unique_ptr`; check `errstr` from every `create`; serve
delivery reports with `producer->poll(0)` in the produce path and
`producer->flush(timeout_ms)` before exit; call `consumer->close()` before the
consumer is destroyed so the group rebalances promptly.

## Deprecated or superseded (deprecated)

| Before | After |
|--------|-------|
| `std::auto_ptr`, raw owning pointers | `std::unique_ptr` / `std::shared_ptr` |
| `std::thread` + manual join flag | `std::jthread` + `std::stop_token` |
| `printf` / `iostream` formatting | `std::format`, `std::print`, spdlog |
| `std::rand` / `srand` | `<random>` engines and distributions |
| global `include_directories` | `target_include_directories` |

## Do not flag

- libpq used directly with RAII wrappers: the collection's choice, the same as a
  plain driver in Python or Go.
- A hand-written libpq connection pool; libpq ships none.
- `new` passed straight into a smart pointer an API requires, such as
  `opentelemetry::nostd::shared_ptr<T>(new T)` in the OTel C++ setup.
- Non-owning raw pointers and references used as observers.
- `std::cout` in a CLI adapter or a test runner's report, where stdout is the
  interface.
- Unsafe code in a chapter or negative test whose subject is the
  failure (`lgtm-systems-programming` demos are LAB-ONLY and say so).
