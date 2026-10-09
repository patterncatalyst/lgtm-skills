# Image builds inside the cluster

The host runs Maven; the cluster runs the image build and pushes to its own
registry. No container engine on the host, no exposed or insecure registry,
and the cluster never pulls from Maven Central.

## JVM services: binary S2I via quarkus-openshift

Each service pom gets an inactive profile (snippet:
`snippets/quarkus-openshift-profile.xml`):

```xml
<profile>
  <id>openshift</id>
  <dependencies>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-openshift</artifactId>
    </dependency>
  </dependencies>
</profile>
```

The profile only applies with `-Popenshift`, so `mvn verify` and the other
runtimes' images are unchanged. `build-images.sh` runs one reactor build:

```bash
mvn -B -q -pl "$modules" -am package -DskipTests -Popenshift \
    -Dquarkus.container-image.build=true \
    -Dquarkus.container-image.tag=v1 \
    -Dquarkus.openshift.version=v1 \
    -Dquarkus.openshift.base-jvm-image=registry.access.redhat.com/ubi10/openjdk-25:1.24-15 \
    -Dquarkus.kubernetes-client.namespace=<project> \
    -Dquarkus.kubernetes.deploy=false
```

Per service, Maven builds the fast-jar (`target/quarkus-app`); the extension
creates a BuildConfig (Source strategy, binary input) and ImageStreams,
uploads the jar, and OpenShift runs the image's S2I assemble script and
pushes `<service>:v1` to the internal registry. Each in-cluster build took
14-20 s on CRC.

Four settings that matter:

- **`quarkus-openshift`, not `quarkus-container-image-openshift` alone.** The
  latter logs `No OpenShift manifests were generated so no OpenShift build
  process will be taking place`: the BuildConfig comes from the manifest
  generator in `quarkus-openshift`.
- **`quarkus.openshift.version` sets the output tag.** With only
  `quarkus.container-image.tag`, the tag stays at the project version
  (`1.0.0-SNAPSHOT`).
- **`quarkus.kubernetes.deploy=false`.** Build and push only; the Helm chart
  owns the Deployments.
- **The base image.** The extension's default is `ubi9/openjdk-25`. Use the
  newest UBI with the newest JDK (`ubi10/openjdk-25`), pinned to an exact
  tag that carries the S2I labels (`io.openshift.s2i.scripts-url=image:///usr/libexec/s2i`):
  ```bash
  skopeo list-tags docker://registry.access.redhat.com/ubi10/openjdk-25
  skopeo inspect docker://registry.access.redhat.com/ubi10/openjdk-25:1.24-15 | jq '.Labels["io.openshift.s2i.scripts-url"]'
  ```
  Fall back to `ubi9/openjdk-25` (same JDK) only if ubi10 lacks it. Never
  drop the JDK version to stay on a newer UBI.

### The S2I image starts the app with run-java.sh

The project's own Containerfile (`ENTRYPOINT ["java", "-jar", ...]`,
`ENV JAVA_TOOL_OPTIONS=...`) is not used. Whatever it set must move into the
chart:

- JVM `-D` flags → `services.<name>.javaToolOptions` (rendered as
  `JAVA_TOOL_OPTIONS`);
- heap → `JAVA_MAX_MEM_RATIO` (default 80; the chart sets 50). The image
  ignores `JAVA_MAX_RAM_RATIO`.

## Native: Docker-strategy binary build with Mandrel

`platform/build-native.sh <service>`:

1. **Host:** `mvn -pl <svc> -am package -Pnative -Dquarkus.native.sources-only=true`
   writes `target/native-sources` (jar, libs, `native-image.args`,
   `graalvm.version`). No `native-image` on the host.
2. **Cluster:** `oc new-build --binary --strategy=docker --to=<svc>-native:v1`,
   patched to request 2 CPU / 4 GiB (limit 8 GiB), then
   `oc start-build --from-dir=<native-sources + Containerfile>`.
   The Containerfile (`templates/openshift/platform/native/Containerfile`)
   runs `native-image $(cat native-image.args)` in
   `quay.io/quarkus/ubi10-quarkus-mandrel-builder-image:jdk-25.0.4.1` and
   copies the runner onto `quay.io/quarkus/ubi10-quarkus-micro-image:2.0-2026-10-04`,
   owned `1001:0` with group-write so an arbitrary restricted-v2 UID can run it.
3. **Deploy:** `deploy.sh --set native.enabled=true --set native.service=<svc>`.
   The chart switches that service's image to `<svc>-native:v1`, drops its
   `JAVA_TOOL_OPTIONS` and its Java-agent annotation (a native binary cannot
   load an agent). The `wait-for-postgres` init container keeps using the JVM
   image, which has bash.

Pick the Mandrel tag that matches `native-sources/graalvm.version`.

### Runtime-init system properties go to the builder

Quarkus initialises many classes at image build time. A system property
read in such a class's static initializer must be set in the
`native-image` builder JVM, not on the running binary:

```bash
NATIVE_BUILD_ARGS='-J-Dorg.apache.avro.SERIALIZABLE_PACKAGES=com.example.events.v1' \
  ./openshift/platform/build-native.sh orders
# → -Dquarkus.native.additional-build-args=-J-D...   (comma-separate several)
```

The script fails if an argument did not reach `native-image.args`. The
symptom when it is missing (Avro): every Kafka send fails with
`java.lang.SecurityException: Forbidden <class>`.

Measured on CRC: native start 0.077 s / 29 MiB working set against 8.0 s /
200 MiB for the JVM pod of the same service; the in-cluster native-image
step took about two minutes.

## Rejected build paths

- A Docker-strategy BuildConfig that runs Maven in the VM: the cluster would
  pull from Maven Central.
- Pushing from a host engine to the exposed registry: needs an
  insecure-registry setting and a host engine.
