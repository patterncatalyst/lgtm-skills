# Base Images

Application service containers use **Red Hat Universal Base Image (UBI)** as their
base. Infrastructure services (Postgres, Kafka, Apicurio, Grafana/LGTM, Ollama, etc.)
keep their upstream pre-packaged images.

**Default to UBI 10.** Use `ubi10/` variants first; fall back to `ubi9/` only when
the UBI 10 equivalent is not yet published (e.g., Python and .NET language images
are currently UBI 9 only).

## Why UBI

- Free to redistribute, no subscription required for base/minimal variants
- RHEL-quality packages, security updates, FIPS-validated crypto
- Consistent with production Red Hat / OpenShift environments
- Available from `registry.access.redhat.com` (no auth) or `registry.redhat.io` (auth)
- Works identically under `docker build` / `docker buildx` as under any other OCI-compliant builder — UBI images are just OCI images, no Docker-specific quirks

## Images by language

| Language | Base image | UBI | Notes |
|----------|-----------|-----|-------|
| Java 25 | `registry.access.redhat.com/ubi10/openjdk-25` | **10** | Preferred builder image for new Quarkus/JVM projects |
| Java 25 (runtime) | `registry.access.redhat.com/ubi10/openjdk-25-runtime` | **10** | Smaller; no compiler; use for the final stage |
| Java 21 | `registry.access.redhat.com/ubi10/openjdk-21` | **10** | For projects pinned to LTS 21 |
| Java 21 (runtime) | `registry.access.redhat.com/ubi10/openjdk-21-runtime` | **10** | Smaller; no compiler |
| Python 3.12 | `registry.access.redhat.com/ubi9/python-312` | 9 | No UBI 10 Python image yet; pip pre-installed |
| Go (runtime) | `registry.access.redhat.com/ubi10/ubi-minimal` | **10** | Multi-stage: build with `docker.io/library/golang:1.26`, copy binary |
| .NET 10 (SDK) | `registry.access.redhat.com/ubi9/dotnet-100` | 9 | No UBI 10 .NET image yet; SDK for build stage |
| .NET 10 (runtime) | `registry.access.redhat.com/ubi9/dotnet-100-aspnet` | 9 | ASP.NET Core runtime only |
| C++ (runtime) | `registry.access.redhat.com/ubi10/ubi-minimal` | **10** | Multi-stage: build with GCC 14 image, copy binary |
| General minimal | `registry.access.redhat.com/ubi10/ubi-minimal` | **10** | ~30 MB, microdnf, good for compiled binaries |
| General full | `registry.access.redhat.com/ubi10/ubi` | **10** | ~200 MB, dnf, bash, more tooling |
| General micro | `registry.access.redhat.com/ubi10/ubi-micro` | **10** | Smallest; no package manager |

## Containerfile patterns

### Java / Quarkus (multi-stage, UBI 10 OpenJDK 25) — preferred

See `templates/Containerfile.multistage-ubi` for the full annotated version. Summary:

```dockerfile
# Build stage — full JDK + Maven
FROM registry.access.redhat.com/ubi10/openjdk-25 AS build
WORKDIR /build
COPY --chown=185 mvnw .
COPY --chown=185 .mvn .mvn
COPY --chown=185 pom.xml .
RUN ./mvnw -B -ntp dependency:go-offline
COPY --chown=185 src ./src
RUN ./mvnw -B -ntp package -DskipTests

# Runtime stage — JRE only, non-root, smaller attack surface
FROM registry.access.redhat.com/ubi10/openjdk-25-runtime AS runtime
WORKDIR /deployments
COPY --from=build --chown=185 /build/target/quarkus-app/ ./
EXPOSE 8080
USER 185
ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]
```

The UBI OpenJDK runtime images already run as UID `185` by default; keeping that
explicit `USER 185` and `--chown=185` on the copy is what makes the image work the
same way under `docker run` as it does under OpenShift's arbitrary-UID policy.

### Python (FastAPI)

```dockerfile
# UBI 9 — no UBI 10 Python image available yet
FROM registry.access.redhat.com/ubi9/python-312

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Go (multi-stage)

```dockerfile
FROM docker.io/library/golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/server

FROM registry.access.redhat.com/ubi10/ubi-minimal
COPY --from=build /app /app
EXPOSE 8080
CMD ["/app"]
```

### .NET 10 (multi-stage)

```dockerfile
# UBI 9 — no UBI 10 .NET image available yet
FROM registry.access.redhat.com/ubi9/dotnet-100 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM registry.access.redhat.com/ubi9/dotnet-100-aspnet
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

### C++ (multi-stage)

```dockerfile
FROM docker.io/library/gcc:14 AS build
WORKDIR /src
COPY . .
RUN cmake -B build -G Ninja && cmake --build build

FROM registry.access.redhat.com/ubi10/ubi-minimal
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
- `docker.io/apicurio/apicurio-registry:3.0.6` — Apicurio schema registry
- `docker.io/debezium/connect:2.7` — Debezium / Kafka Connect
- `docker.io/provectuslabs/kafka-ui:latest` — Kafka UI
- `docker.io/ollama/ollama:latest` — Ollama (opt-in profile; heaviest image in the stack)
- `ghcr.io/open-feature/flagd:latest` — flagd

## Building with `docker`

```bash
# BuildKit is the default builder for current Docker Engine/Desktop — no flag needed
docker build -t your-org/your-app:dev -f Containerfile .

# Multi-platform builds (e.g., building an arm64 image from an x86_64 laptop)
docker buildx build --platform linux/amd64,linux/arm64 -t your-org/your-app:dev .

# Building via compose (uses the `build:` block on a service)
docker compose build app
```
