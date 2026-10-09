# Base Images

Application service containers use **Red Hat Universal Base Image (UBI)** as their
base. Infrastructure services (Postgres, Kafka, Redis, Grafana/LGTM, etc.) keep
their upstream pre-packaged images.

**Default to the newest UBI (currently 10).** Use `ubi10/` variants first; fall back
to `ubi9/` only when the UBI 10 equivalent is not published for the same runtime
version (currently only .NET is UBI 9 only). See "Selecting a base image" below.

## Why UBI

- Free to redistribute, no subscription required for base/minimal variants
- RHEL-quality packages, security updates, FIPS-validated crypto
- Consistent with production Red Hat / OpenShift environments
- Available from `registry.access.redhat.com` (no auth) or `registry.redhat.io` (auth)

## Selecting a base image

Always check for the newest UBI first. Selection order for any language image:

1. **Newest UBI major with the newest runtime.** `ubi10` over `ubi9`, and the
   newest runtime version the registry offers (Python 3.14, JDK 25).
2. **Older UBI major with that same newest runtime** (e.g. `ubi9/python-314`)
   when step 1 does not exist.

Never drop the runtime version to stay on a newer UBI, and never stay on an old
runtime because it is available on the newer UBI. Image names also differ per
major: UBI 10 publishes only `-minimal` Python images (`ubi10/python-314-minimal`;
there is no `ubi10/python-314`), and minimal images have no compiler (add one
with `microdnf` in a builder stage if wheels compile, or use `ubi9/python-314`).

Pin exact tags; find and confirm them with skopeo:

```bash
skopeo list-tags docker://registry.access.redhat.com/ubi10/python-314-minimal
skopeo list-tags docker://registry.access.redhat.com/ubi10/openjdk-25:1.24-15
skopeo inspect  docker://registry.access.redhat.com/ubi10/openjdk-25:1.24-15
```

A missing repo or tag in `list-tags` means that combination is not published
yet; move to step 2. Tags below were verified 2026-10-09; re-check before use.

## Images by language

| Language | Base image | UBI | Notes |
|----------|-----------|-----|-------|
| Python 3.14 | `registry.access.redhat.com/ubi10/python-314-minimal:10.2-1791464217` | **10** | UBI 10 has `-minimal` Python only (no compiler); fallback `ubi9/python-314:9.8-1791466446` (full, s2i) |
| Go (runtime) | `registry.access.redhat.com/ubi10/ubi-minimal:10.2-1791444377` | **10** | Multi-stage: build with `golang:1.26`, copy binary |
| Java 25 | `registry.access.redhat.com/ubi10/openjdk-25:1.24-15` | **10** | Default JDK; for Spring Boot / Quarkus / Camel fat-jars; fallback `ubi9/openjdk-25:1.24-3` |
| Java 25 (runtime) | `registry.access.redhat.com/ubi10/openjdk-25-runtime:1.24-15` | **10** | Smaller; no compiler; use for the final stage |
| .NET 10 (SDK) | `registry.access.redhat.com/ubi9/dotnet-100:9.8-1791421718` | 9 | No UBI 10 .NET image yet; SDK for build stage |
| .NET 10 (runtime) | `registry.access.redhat.com/ubi9/dotnet-100-aspnet:9.8-1791363520` | 9 | ASP.NET Core runtime only |
| C++ (runtime) | `registry.access.redhat.com/ubi10/ubi-minimal:10.2-1791444377` | **10** | Multi-stage: build with GCC 14 image, copy binary |
| General minimal | `registry.access.redhat.com/ubi10/ubi-minimal:10.2-1791444377` | **10** | ~30 MB, microdnf, good for compiled binaries |
| General full | `registry.access.redhat.com/ubi10/ubi:10.2-1791444044` | **10** | ~200 MB, dnf, bash, more tooling |
| General micro | `registry.access.redhat.com/ubi10/ubi-micro:10.2-1791441953` | **10** | Smallest; no package manager |

## Containerfile patterns

### Python (FastAPI)

```containerfile
# UBI 10 ships only -minimal Python images; fallback is ubi9/python-314 (same Python)
FROM registry.access.redhat.com/ubi10/python-314-minimal:10.2-1791464217

WORKDIR /opt/app-root/src
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Go (multi-stage)

```containerfile
FROM docker.io/library/golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/server

FROM registry.access.redhat.com/ubi10/ubi-minimal:10.2-1791444377
COPY --from=build /app /app
EXPOSE 8080
CMD ["/app"]
```

### Java / Quarkus (fat jar)

```containerfile
FROM registry.access.redhat.com/ubi10/openjdk-25-runtime:1.24-15
COPY target/quarkus-app /deployments
EXPOSE 8080
CMD ["java", "-jar", "/deployments/quarkus-run.jar"]
```

### .NET 10 (multi-stage)

```containerfile
# UBI 9 — no ubi10/dotnet-100* image published yet
FROM registry.access.redhat.com/ubi9/dotnet-100:9.8-1791421718 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM registry.access.redhat.com/ubi9/dotnet-100-aspnet:9.8-1791363520
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

### C++ (multi-stage)

```containerfile
FROM docker.io/library/gcc:14 AS build
WORKDIR /src
COPY . .
RUN cmake -B build -G Ninja && cmake --build build

FROM registry.access.redhat.com/ubi10/ubi-minimal:10.2-1791444377
COPY --from=build /src/build/server /app
EXPOSE 8080
CMD ["/app"]
```

## What uses upstream images (not UBI)

These infrastructure services use their vendor-provided images as-is:

- `docker.io/grafana/otel-lgtm` — LGTM observability stack
- `docker.io/library/postgres:16-alpine` — Postgres
- `docker.io/apache/kafka:3.8.0` — Kafka
- `docker.io/library/redis:7-alpine` — Redis
- `docker.io/debezium/connect:2.7` — Debezium / Kafka Connect
- `ghcr.io/open-feature/flagd:latest` — flagd

Kafka UI (a browser dashboard) is intentionally not included — this stack prefers CLI
tooling, and Kafka is inspected with `kcat` (a host CLI tool, not a container image).
