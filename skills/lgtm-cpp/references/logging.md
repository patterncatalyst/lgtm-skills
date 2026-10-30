# Logging for AI-assisted development

Example apps log through **spdlog** to the console *and* to a rotating file, so
Claude Code can read what happened after a crash or a failing test. Console output
alone scrolls away and cannot be grep'd by an agent post-mortem. This is not an
observability stack — there is no Grafana, Loki, Tempo, or Mimir, and no container.
It is a local rotating log file plus console output.

## Why spdlog

- Open source (MIT), header-only or compiled, pulled through Conan.
- Fast, structured, with built-in console and rotating-file sinks.
- Levels (`trace`..`critical`) map cleanly to what an agent greps for (`error`,
  `warn`).

Pin it in `conanfile.py` (survey the latest stable first):

```python
self.requires("spdlog/__PINNED__")   # conan search spdlog -r conancenter
```

```cmake
find_package(spdlog REQUIRED)
target_link_libraries(app PRIVATE spdlog::spdlog)
```

## Setup: console + rotating file

```cpp
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>

#include <memory>
#include <vector>

void init_logging(const std::string& app_name) {
    auto console = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    // 5 files, 5 MB each, under logs/ (gitignored)
    auto file = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
        "logs/" + app_name + ".log", 5 * 1024 * 1024, 5);

    std::vector<spdlog::sink_ptr> sinks{console, file};
    auto logger = std::make_shared<spdlog::logger>(app_name, sinks.begin(), sinks.end());

    logger->set_level(spdlog::level::debug);
    logger->flush_on(spdlog::level::warn);   // never lose a warning/error on crash
    logger->set_pattern("%Y-%m-%d %H:%M:%S.%e [%^%l%$] [%n] %v");

    spdlog::set_default_logger(logger);
}
```

Then log through the default logger:

```cpp
spdlog::info("quoting carrier={} weight={}", carrier, weight);
spdlog::warn("no quote for carrier={}", carrier);
spdlog::error("gateway failed: {}", ex.what());
```

## Reading logs with Claude Code

After a crash or a failing test:

```bash
grep -nE '\[error\]|\[warning\]|\[critical\]' logs/app.log   # the failures
tail -n 80 logs/app.log                                       # the lead-up
```

Claude reads `logs/<app>.log` alongside the CTest output to reconstruct what
happened. `flush_on(warn)` guarantees warnings and errors reach the file even if the
process aborts (including under a sanitizer).

## Gitignore the logs

```gitignore
logs/
build/
```

## What this is not

- Not an observability stack. No Grafana/Loki/Tempo/Mimir, no OTLP export. When a
  project genuinely needs distributed tracing or metrics, add `opentelemetry-cpp`
  (CNCF, vendor-neutral) and pair with the relevant stack skill — this logging setup
  stays as the always-on local baseline.
- Not a container concern. The log file is on the local filesystem under `logs/`.
