# Structured File Logging for Claude Code

Spring Boot (logback) file logging with rotation enables Claude Code to read
logs after a crash, test failure, or unexpected behavior — essential for
AI-assisted diagnosis.

## Why file logging matters for AI agents

Console output scrolls away and can't be retrieved after a process exits. File
logging gives Claude Code a persistent, grep-able record of what happened.
There is no MCP log-reading tool for Spring Boot (unlike the Quarkus Agent
MCP's `quarkus_app_log`) — Claude Code reads the file directly.

## Configuration

Add to `src/main/resources/application.properties`:

```properties
# ── File logging ────────────────────────────────────────────
logging.file.name=logs/${spring.application.name}.log
logging.logback.rollingpolicy.max-file-size=10MB
logging.logback.rollingpolicy.max-history=5
logging.logback.rollingpolicy.file-name-pattern=logs/${spring.application.name}-%d{yyyy-MM-dd}.%i.log
logging.pattern.file=%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%logger{40}] (%thread) %msg%n
```

Equivalent YAML (`application.yaml`):

```yaml
logging:
  file:
    name: logs/${spring.application.name}.log
  logback:
    rollingpolicy:
      max-file-size: 10MB
      max-history: 5
      file-name-pattern: logs/${spring.application.name}-%d{yyyy-MM-dd}.%i.log
  pattern:
    file: "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%logger{40}] (%thread) %msg%n"
```

## Dev profile override

Keep console as primary in local dev but still write files:

```properties
%dev.logging.file.name=logs/dev.log
%dev.logging.level.root=INFO
%dev.logging.level.com.example=DEBUG
```

Spring Boot doesn't support Quarkus-style `%dev.` property prefixes directly —
use a dedicated `application-dev.properties` activated with
`spring.profiles.active=dev` instead:

```properties
# application-dev.properties
logging.file.name=logs/dev.log
logging.level.root=INFO
logging.level.com.example=DEBUG
```

## Log directory convention

```
project-root/
├── logs/
│   ├── my-service.log                      ← current
│   ├── my-service-2026-08-16.0.log         ← rotated
│   └── my-service-2026-08-15.0.log
├── src/
└── pom.xml
```

Add `logs/` to `.gitignore`.

## Per-category tuning

Reduce noise from frameworks, keep application logs verbose:

```properties
logging.level.org.apache.kafka=WARN
logging.level.org.springframework=INFO
logging.level.com.mycompany=DEBUG
```

## Custom `logback-spring.xml` (optional, for finer control)

For rotation and format beyond what `application.properties` exposes, define
`src/main/resources/logback-spring.xml`:

```xml
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/${spring.application.name:-app}.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>logs/${spring.application.name:-app}-%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>5</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%logger{40}] (%thread) %msg%n</pattern>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="FILE"/>
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

## Reading logs with Claude Code

After a failure, Claude Code can:
1. Read the log file directly: `Read logs/my-service.log`
2. Grep for errors: `grep -n 'ERROR\|WARN\|Exception' logs/my-service.log`
3. Tail the active log while the app runs in the background.

The structured format with timestamps, log levels, and short logger names
makes it straightforward for an AI agent to identify the failure chain.
