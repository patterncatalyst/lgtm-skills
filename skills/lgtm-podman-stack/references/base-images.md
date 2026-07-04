# Base Images

Application service containers use **Red Hat Universal Base Image (UBI)** as their
base. Infrastructure services (Postgres, Kafka, Redis, Grafana/LGTM, etc.) keep
their upstream pre-packaged images.

## Why UBI

- Free to redistribute, no subscription required for base/minimal variants
- RHEL-quality packages, security updates, FIPS-validated crypto
- Consistent with production Red Hat / OpenShift environments
- Available from `registry.access.redhat.com` (no auth) or `registry.redhat.io` (auth)

## UBI 9 images by language

| Language | Base image | Notes |
|----------|-----------|-------|
| Python 3.12 | `registry.access.redhat.com/ubi9/python-312` | pip pre-installed, use for FastAPI/grpcio |
| Python 3.11 | `registry.access.redhat.com/ubi9/python-311` | If 3.12 compatibility is an issue |
| Go (runtime) | `registry.access.redhat.com/ubi9/ubi-minimal` | Multi-stage: build with `golang:1.26`, copy binary to ubi-minimal |
| Java 21 | `registry.access.redhat.com/ubi9/openjdk-21` | For Spring Boot / Quarkus fat-jars |
| Java 21 (runtime) | `registry.access.redhat.com/ubi9/openjdk-21-runtime` | Smaller; no compiler |
| .NET 8 | `registry.access.redhat.com/ubi9/dotnet-80` | SDK image for build |
| .NET 8 (runtime) | `registry.access.redhat.com/ubi9/dotnet-80-runtime` | Runtime only |
| C++ (runtime) | `registry.access.redhat.com/ubi9/ubi-minimal` | Multi-stage: build with GCC 14 image, copy binary |
| General minimal | `registry.access.redhat.com/ubi9/ubi-minimal` | ~30 MB, microdnf, good for compiled binaries |
| General full | `registry.access.redhat.com/ubi9/ubi` | ~200 MB, dnf, bash, more tooling |

## Containerfile patterns

### Python (FastAPI)

```containerfile
FROM registry.access.redhat.com/ubi9/python-312

WORKDIR /app
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

FROM registry.access.redhat.com/ubi9/ubi-minimal
COPY --from=build /app /app
EXPOSE 8080
CMD ["/app"]
```

### Java / Quarkus (fat jar)

```containerfile
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
COPY target/quarkus-app /deployments
EXPOSE 8080
CMD ["java", "-jar", "/deployments/quarkus-run.jar"]
```

### C++ (multi-stage)

```containerfile
FROM docker.io/library/gcc:14 AS build
WORKDIR /src
COPY . .
RUN cmake -B build -G Ninja && cmake --build build

FROM registry.access.redhat.com/ubi9/ubi-minimal
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
- `docker.io/provectuslabs/kafka-ui:latest` — Kafka UI
- `ghcr.io/open-feature/flagd:latest` — flagd
