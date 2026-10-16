# Reproducer repo layouts

There is one public repo per upstream project, `<owner>/<project>-reproducers`. Inside it, each bug gets its own module or
directory, named after the symptom. Each module contains:
- the smallest app that shows the bug,
- one test file whose **bug tests assert the expected behaviour** and fail today,
- at least one **control test** that passes today.

The top-level README holds a table with columns module | bug | issue link, the run commands for every line in
the version matrix, the expected red/green counts, and the license, which should match upstream.

## Maven / Quarkus (multi-module)

```
<project>-reproducers/
├── pom.xml                      # parent: modules, BOM import, overridable versions, override profile
├── README.md
├── LICENSE                      # match upstream (e.g. Apache-2.0)
├── .gitignore                   # target/ .idea/ *.iml .vscode/
└── <symptom-module>/
    ├── pom.xml                  # parent ref + artifactId only
    └── src/
        ├── main/java/org/acme/Api.java
        ├── main/resources/application.properties
        └── test/java/org/acme/<Symptom>Test.java
```

Parent `pom.xml` essentials:

```xml
<properties>
  <maven.compiler.release>21</maven.compiler.release>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  <!-- Override to test other lines, e.g. -Dquarkus.platform.version=4.0.0.Beta1 -->
  <quarkus.platform.version>X.Y.Z</quarkus.platform.version>
  <surefire.version>latest stable</surefire.version>
</properties>

<dependencyManagement><dependencies>
  <dependency><groupId>io.quarkus.platform</groupId><artifactId>quarkus-bom</artifactId>
    <version>${quarkus.platform.version}</version><type>pom</type><scope>import</scope></dependency>
</dependencies></dependencyManagement>

<dependencies>
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-<extension-under-test></artifactId></dependency>
  <!-- quarkus-junit, not quarkus-junit5: Quarkus 4 renamed it and both 3.x and 4.x BOMs carry quarkus-junit -->
  <dependency><groupId>io.quarkus</groupId><artifactId>quarkus-junit</artifactId><scope>test</scope></dependency>
  <dependency><groupId>io.rest-assured</groupId><artifactId>rest-assured</artifactId><scope>test</scope></dependency>
</dependencies>

<profiles>
  <!-- Pin the library over the BOM, e.g. a locally built main:
       mvn clean verify -Dquarkus.platform.version=<next> -D<lib>.version=<ver>-SNAPSHOT -->
  <profile>
    <id><lib>-override</id>
    <activation><property><name><lib>.version</name></property></activation>
    <dependencyManagement><dependencies>
      <!-- one entry per artifact of the library, all at ${<lib>.version} -->
    </dependencies></dependencyManagement>
  </profile>
</profiles>
```

Notes:
- Explicitly managed versions take precedence over imported BOMs, so the profile wins whatever the order.
- **Document `mvn clean verify`, never plain `verify`.** When you switch the framework line, stale `target/` classes break
  JUnit discovery ("ClassSelector … resolution failed").
- Check which versions each line actually resolves with `mvn -q dependency:list -DoutputFile=/dev/stdout | grep <lib>`,
  and record that in the issue's Environment table.
- To build `main` locally, clone it shallow, then
  `./mvnw -q install -DskipTests -Dcheckstyle.skip -Dformatter.skip -Dimpsort.skip -Drevapi.skip -Dmaven.javadoc.skip -Denforcer.skip -pl <modules> -am`.
  The snapshot lands only in `~/.m2/…/<version>-SNAPSHOT`, so the project's own pinned build is untouched.
- Turn on any framework switches the bug needs, and comment why in `application.properties`. Two examples:
  - SmallRye CDI events fire only with `quarkus.smallrye-graphql.events.enabled=true`;
  - the printed schema shows directives only with `schema-include-directives=true`.

Test pattern (`@QuarkusTest` + REST Assured):

```java
@QuarkusTest
class SymptomTest {

    @Test
    void controlThatPassesToday() {          // proves the app is wired correctly
        post("{\"query\":\"{ echoId(id: \\\"a\\\") }\"}").body("data.echoId", equalTo("a"));
    }

    @Test
    void expectedBehaviour() {                // fails today, passes once fixed
        post("{\"query\":\"{ echoIds(ids: [\\\"a\\\", \\\"b\\\"]) }\"}")
                .body("errors", nullValue())
                .body("data.echoIds", contains("a", "b"));
    }

    private static ValidatableResponse post(String body) {
        return given().contentType(ContentType.JSON).body(body)
                .when().post("/graphql")
                .then().log().ifValidationFails().statusCode(200);
    }
}
```

Name the tests after the expected behaviour (`introspectionReportsTheSmallRyeAnnotationOnAField`), not after the bug.

## Python / pytest (uv)

```
<project>-reproducers/
├── README.md
├── LICENSE
└── <symptom-dir>/
    ├── pyproject.toml           # [project] requires-python, dependencies pinned with ==
    ├── uv.lock
    ├── app.py                   # the smallest app
    └── test_<symptom>.py        # bug tests assert expected behaviour; at least one control
```

Run the pinned line, then override it with a pre-release or with `main`:

```console
uv run pytest -q                                                    # pinned versions from uv.lock
uv run --with '<lib>==<pre-release>' pytest -q                      # next line
uv run --with 'git+https://github.com/<org>/<lib>@<sha>' pytest -q  # main at a commit
```

For an ASGI app (FastAPI, Strawberry), use the framework's own test client (`fastapi.testclient.TestClient`
or `httpx.ASGITransport`). That keeps the reproducer free of servers and ports.

## Publishing checklist

1. Run every documented command from a clean checkout and confirm the red/green counts match the README.
2. `gh repo create <owner>/<project>-reproducers --public --description "…" --source . --remote origin --push`, or, for a
   new module in an existing repo, commit and push it.
3. File the issue, then replace `_link added after filing_` in the README table and push again.
4. Commit using the user's configured git identity (`git config user.name` / `user.email`). Never invent one.
