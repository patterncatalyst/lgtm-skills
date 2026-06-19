# C++ Instrumentation

C++ OpenTelemetry support exists via the `opentelemetry-cpp` library. It's mature for traces and metrics; logs are usable but less polished. Setup is more involved than dynamic languages — you'll write CMake config and manage dependencies, but the runtime cost is minimal once it's running.

## Honest scope statement

Unlike Python and Quarkus, C++ has **no auto-instrumentation**. There's no ABI-stable runtime to hook into, no annotation processor, no class loader to inject into. Every span is explicit. Every metric is explicit. Plan for that overhead in your project schedule.

The pattern below is the minimum viable instrumentation. For a serious deployment, plan for a small abstraction layer in your codebase that hides OTel API specifics from business logic.

## Setup

### 1. Install dependencies

The library is most easily integrated via vcpkg or Conan, or built from source with CMake.

**vcpkg:**

```bash
vcpkg install opentelemetry-cpp
```

**CMake FetchContent (no package manager):**

```cmake
include(FetchContent)
FetchContent_Declare(
    opentelemetry-cpp
    GIT_REPOSITORY https://github.com/open-telemetry/opentelemetry-cpp.git
    GIT_TAG v1.16.0
)
set(WITH_OTLP_HTTP ON CACHE BOOL "")
set(WITH_OTLP_GRPC OFF CACHE BOOL "")
set(WITH_EXAMPLES OFF CACHE BOOL "")
FetchContent_MakeAvailable(opentelemetry-cpp)
```

### 2. Link in your CMakeLists.txt

```cmake
target_link_libraries(your_app PRIVATE
    opentelemetry_trace
    opentelemetry_exporter_otlp_http
    opentelemetry_resources
    opentelemetry_common
)
```

### 3. Initialize the SDK once at startup

```cpp
// telemetry.h
#pragma once
#include <string>

namespace telemetry {
    void init(const std::string& service_name, const std::string& otlp_endpoint);
    void shutdown();
}
```

```cpp
// telemetry.cpp
#include "telemetry.h"

#include <opentelemetry/exporters/otlp/otlp_http_exporter_factory.h>
#include <opentelemetry/sdk/resource/resource.h>
#include <opentelemetry/sdk/trace/batch_span_processor_factory.h>
#include <opentelemetry/sdk/trace/tracer_provider_factory.h>
#include <opentelemetry/trace/provider.h>

namespace trace_api = opentelemetry::trace;
namespace trace_sdk = opentelemetry::sdk::trace;
namespace resource = opentelemetry::sdk::resource;
namespace otlp = opentelemetry::exporter::otlp;

namespace telemetry {

void init(const std::string& service_name, const std::string& otlp_endpoint) {
    // Exporter
    otlp::OtlpHttpExporterOptions opts;
    opts.url = otlp_endpoint + "/v1/traces";
    auto exporter = otlp::OtlpHttpExporterFactory::Create(opts);

    // Batch processor
    trace_sdk::BatchSpanProcessorOptions batch_opts;
    auto processor = trace_sdk::BatchSpanProcessorFactory::Create(
        std::move(exporter), batch_opts);

    // Resource
    auto resource = resource::Resource::Create({
        {"service.name", service_name},
        {"service.version", "1.0"},
        {"deployment.environment", "local"},
    });

    // Tracer provider
    std::shared_ptr<trace_api::TracerProvider> provider =
        trace_sdk::TracerProviderFactory::Create(std::move(processor), resource);
    trace_api::Provider::SetTracerProvider(provider);
}

void shutdown() {
    std::shared_ptr<trace_api::TracerProvider> provider;
    trace_api::Provider::SetTracerProvider(provider);  // releases the static
}

}  // namespace telemetry
```

### 4. Use in main()

```cpp
#include "telemetry.h"

int main(int argc, char** argv) {
    telemetry::init("your-service", "http://lgtm:4318");

    // your application code

    telemetry::shutdown();
    return 0;
}
```

## Creating spans

```cpp
#include <opentelemetry/trace/provider.h>

namespace trace_api = opentelemetry::trace;

void process_order(const Order& order) {
    auto tracer = trace_api::Provider::GetTracerProvider()
        ->GetTracer("your-service");

    auto span = tracer->StartSpan("order.process", {
        {"order.id", order.id},
        {"order.total", order.total},
    });
    auto scope = tracer->WithActiveSpan(span);

    try {
        // business logic
        save_to_database(order);
    } catch (const std::exception& e) {
        span->SetStatus(trace_api::StatusCode::kError, e.what());
        throw;
    }

    span->End();
}
```

The RAII pattern (`scope` going out of scope) ensures the active span is cleared correctly even on exception. The span itself must still be explicitly `End()`'d — that's not RAII.

If you forget `End()`, the span is never exported.

## Context propagation across HTTP

C++ doesn't have a standard HTTP client, so context propagation is per-library. If you use libcurl, cpr, or Boost.Beast, you'll need to inject W3C trace context headers manually:

```cpp
#include <opentelemetry/context/propagation/global_propagator.h>
#include <opentelemetry/trace/propagation/http_trace_context.h>

// Outgoing request: inject trace context into HTTP headers
class HeaderCarrier : public opentelemetry::context::propagation::TextMapCarrier {
public:
    std::unordered_map<std::string, std::string> headers;

    opentelemetry::nostd::string_view Get(
        opentelemetry::nostd::string_view key) const noexcept override {
        auto it = headers.find(std::string(key));
        return it != headers.end() ? it->second : "";
    }

    void Set(opentelemetry::nostd::string_view key,
             opentelemetry::nostd::string_view value) noexcept override {
        headers[std::string(key)] = std::string(value);
    }
};

void make_request(const std::string& url) {
    HeaderCarrier carrier;
    auto propagator = opentelemetry::context::propagation::GlobalTextMapPropagator::GetGlobalPropagator();
    auto context = opentelemetry::context::RuntimeContext::GetCurrent();
    propagator->Inject(carrier, context);

    // Pass carrier.headers to your HTTP client
    // The receiving service's instrumentation will extract them
}
```

This is verbose. Encapsulate it in your project's HTTP client wrapper so callers don't need to know.

## Logging correlation

The `opentelemetry-cpp` logs API exists but is less standardized than traces. For practical correlation between logs and traces:

1. Use your existing logger (`spdlog`, `glog`, whatever)
2. Extract `trace_id` and `span_id` from the current span and inject as log fields
3. Configure your logger's format to include them

```cpp
#include <spdlog/spdlog.h>

void log_with_trace_context(const std::string& message) {
    auto span = trace_api::Tracer::GetCurrentSpan();
    if (span->GetContext().IsValid()) {
        char trace_id[33];
        char span_id[17];
        span->GetContext().trace_id().ToLowerBase16(trace_id);
        span->GetContext().span_id().ToLowerBase16(span_id);
        spdlog::info("[trace_id={} span_id={}] {}", trace_id, span_id, message);
    } else {
        spdlog::info("{}", message);
    }
}
```

For a serious project, wrap this in a logging macro or function.

## Common pitfalls

- **Forgetting `span->End()`.** RAII handles `Scope` but not the span itself. Always explicitly end spans. A common pattern is a helper that does both:

  ```cpp
  class ScopedSpan {
      std::unique_ptr<trace_api::Span> span_;
      std::unique_ptr<trace_api::Scope> scope_;
  public:
      ScopedSpan(trace_api::Tracer* tracer, const std::string& name) {
          span_ = tracer->StartSpan(name);
          scope_ = std::make_unique<trace_api::Scope>(tracer->WithActiveSpan(span_));
      }
      ~ScopedSpan() { span_->End(); }
  };
  ```

- **CMake header conflicts.** opentelemetry-cpp pulls in protobuf, gRPC (if you enable it), abseil, nlohmann_json. If your project already uses these, version conflicts are likely. Pin versions explicitly.

- **Thread safety.** The tracer is thread-safe. The current-span context is thread-local. If you start a span on one thread and need to continue it on another (futures, thread pools), you must explicitly extract the context and re-attach it on the worker thread.

- **Binary size.** The full opentelemetry-cpp library is several MB compiled. For embedded or size-constrained deployments, build with only the exporters and signals you need (`WITH_OTLP_HTTP=ON`, `WITH_OTLP_GRPC=OFF`, etc.).

## When to skip C++ OTel

For very simple services (single-file, no dependencies), writing OTLP HTTP exports directly with libcurl + nlohmann_json may be lighter than pulling in the full opentelemetry-cpp library. The OTLP protobuf schema is documented; you can construct payloads by hand.

This is rarely worth it. The library handles edge cases (batching, retries, resource detection, propagation) that you'd otherwise reimplement.
