# Testcontainers and Quarkus Dev Services

Two related but distinct patterns for getting containers into a dev/test loop
*without* hand-maintaining a compose file for them. Both sit on top of the same
Docker daemon the compose stack uses — they're not a separate technology, just a
different lifecycle: disposable, per-test-run containers instead of a long-lived
demo stack.

**Rule of thumb:** use compose for anything a human looks at (Grafana) or
that needs to survive across multiple runs of the app. Use Testcontainers/Dev
Services for anything a test suite needs transiently.

## Quarkus Dev Services

Quarkus can auto-provision Kafka, Postgres, Redis, Kafka Connect/Debezium, and other
backing services **with zero configuration** during `quarkus:dev` and `quarkus:test`,
as long as:

1. The corresponding extension is on the classpath (e.g. `quarkus-kafka-client`,
   `quarkus-jdbc-postgresql`, `quarkus-redis-client`)
2. No connection URL/host/port is configured for that service in the active profile
   (Dev Services only activates when Quarkus doesn't already know where to connect)
3. Docker is running and reachable

Quarkus uses Testcontainers under the hood, picks a sensible image, starts it, wires
the connection properties into the application automatically, and tears it down when
the dev session or test run ends.

### Minimal example — nothing to write

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-jdbc-postgresql</artifactId>
</dependency>
```

```properties
# application.properties — deliberately empty of connection info in dev/test
%dev.quarkus.datasource.devservices.enabled=true
%test.quarkus.datasource.devservices.enabled=true
```

Run `quarkus dev` (or `./mvnw quarkus:dev`). A throwaway Postgres container appears,
the datasource connects to it, and it's gone when you stop the dev session. No
compose file, no manual container, no cleanup.

### Pinning the image

Dev Services picks a default image per service type. Pin it explicitly when you need
a specific version (matching what the demo's `compose-with-postgres.yaml` runs, for
example, so dev-mode behavior matches the standing stack):

```properties
quarkus.datasource.devservices.image-name=docker.io/library/postgres:18.6-alpine
quarkus.kafka.devservices.image-name=docker.io/apache/kafka:4.3.1
```

### Reusing containers across test runs

By default, each test run's Dev Services containers stop and get removed after the
run. For faster local iteration (not CI), enable the Testcontainers reuse feature so
the same container is reused across runs instead of a fresh one paying startup cost
every time:

```properties
# ~/.testcontainers.properties (host-level, NOT project-level — opt-in per developer)
testcontainers.reuse.enable=true
```

```properties
# application.properties
quarkus.datasource.devservices.reuse=true
```

Don't enable reuse in CI — CI wants clean, isolated containers every run, and a
reused container that accumulated state from a previous failed run is a worse bug
than the few extra seconds of startup.

### When to turn Dev Services off

Set `quarkus.<extension>.devservices.enabled=false` for a given service when you'd
rather point the running app at the standing compose stack instead — e.g. an
integration test that specifically wants to exercise the same Kafka/Postgres/Apicurio
instance a demo's Grafana dashboards are watching. Then set the connection properties
explicitly (`quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/appdb`,
etc.) pointing at the compose stack's host-mapped ports.

### Dev Services and observability

Dev Services containers are just containers — if the LGTM stack from
`compose-lgtm-only.yaml` is already running and reachable at
`http://localhost:4318`, point `quarkus.otel.exporter.otlp.endpoint` at it during
`%dev` and traces/metrics from Dev-Services-backed local runs show up in the same
Grafana instance as everything else. This is often the fastest inner loop: real
observability, zero hand-maintained infra beyond the LGTM container itself.

## Testcontainers directly (non-Quarkus, or fine-grained control)

For languages/frameworks without a Dev-Services-equivalent (plain JVM test suites
without Quarkus, Go, Python via `testcontainers-python`), use Testcontainers
directly. The pattern is the same across languages: describe the container in code,
start it in a test fixture/setup hook, and let the library's cleanup hook (Ryuk)
handle teardown.

### Java (JUnit 5)

```java
@Testcontainers
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:18.6-alpine")
            .withDatabaseName("appdb")
            .withUsername("appuser")
            .withPassword("apppass");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("quarkus.datasource.jdbc.url", postgres::getJdbcUrl);
        registry.add("quarkus.datasource.username", postgres::getUsername);
        registry.add("quarkus.datasource.password", postgres::getPassword);
    }

    // tests run against the real Postgres container
}
```

### Python

```python
from testcontainers.postgres import PostgresContainer

def test_something():
    with PostgresContainer("postgres:18.6-alpine") as postgres:
        conn_url = postgres.get_connection_url()
        # run test logic against conn_url
```

### Go

```go
import (
    "context"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestSomething(t *testing.T) {
    ctx := context.Background()
    pgContainer, err := postgres.Run(ctx, "postgres:18.6-alpine",
        postgres.WithDatabase("appdb"),
        postgres.WithUsername("appuser"),
        postgres.WithPassword("apppass"),
    )
    defer pgContainer.Terminate(ctx)
    // run test logic
}
```

## Ryuk and the Docker socket

Every Testcontainers-based flow (including Dev Services) starts a small sidecar
container called **Ryuk** the first time a test container is requested. Ryuk watches
the test process and force-removes any containers it started if the process dies
uncleanly, so a crashed test run doesn't leave orphaned containers running forever.

This means Testcontainers needs:

1. **Access to the Docker socket** (`/var/run/docker.sock` on Linux/Docker Desktop;
   `$XDG_RUNTIME_DIR/docker.sock` under rootless Docker). If tests run inside a
   container themselves (CI runner, a devcontainer), the socket must be bind-mounted
   in — see the devcontainer template's `docker-compose.devcontainer.yaml`, which
   does this via `/var/run/docker.sock:/var/run/docker.sock`.
2. **The ability to launch a sibling container** (Ryuk itself). This is
   Docker-outside-of-Docker via the mounted socket, not Docker-in-Docker — no nested
   daemon required, which is why the socket-mount approach is preferred over running
   a full Docker daemon inside the devcontainer.

### Disabling Ryuk (use sparingly)

Some CI systems (GitHub Actions with certain runner images, GitLab's Docker executor
in specific configurations) already tear down all containers between jobs, making
Ryuk redundant — and in locked-down sandboxes, Ryuk's own container launch can be
what's actually failing. In those cases only:

```bash
export TESTCONTAINERS_RYUK_DISABLED=true
```

Don't set this as a default in application code or a checked-in `.env` — it should
be an explicit, documented CI-environment override, because disabling it on a
developer laptop just means orphaned containers accumulate silently.

### Common failure: "Could not find a valid Docker environment"

Checklist, in order of likelihood:

1. Is the Docker daemon actually running? (`docker ps`)
2. Is `DOCKER_HOST` pointing at the right context? (`docker context ls`,
   `docker context inspect`) — this bites people who've switched between Docker
   Desktop and a remote/rootless Docker context.
3. If running inside a container: is the socket mounted, and does the container's
   user have permission to read/write it? On SELinux-enforcing hosts, the mount may
   need a `:z` suffix.
4. Is this rootless Docker? Testcontainers' auto-detection needs
   `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock` set explicitly in some rootless
   configurations where auto-detection doesn't find it.

## How this relates to the compose stack

Dev Services and Testcontainers are not a replacement for `compose-full.yaml` — they
solve a different problem (test isolation vs. a shared demo environment). A typical
project uses both:

- **`quarkus:test` / `mvn test`** → Dev Services spins up exactly what that test
  class needs, in isolation, torn down after.
- **`docker compose --profile lgtm --profile kafka up -d`** → a standing stack for
  manual exploration, demos, and anything that needs to be observed in Grafana over
  time.

Keep the image versions consistent between the two (pin the same Postgres/Kafka tags
in Dev Services config as in the compose templates) so behavior doesn't drift between
"what the tests saw" and "what the demo shows."
