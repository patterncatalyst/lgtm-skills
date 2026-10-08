# Structured File Logging for Claude Code

Python file logging with rotation enables Claude Code to read logs after a crash,
test failure, or unexpected behavior — essential for AI-assisted diagnosis.

## Why file logging matters for AI agents

Console output scrolls away and can't be retrieved after a process exits. File
logging gives Claude Code a persistent, grep-able record of what happened.
Without a separate MCP log channel (there is no Python equivalent of the
Quarkus Agent MCP), reading the log file directly is the primary way Claude
Code inspects what a running or crashed process did.

## Configuration

Use the stdlib `logging` module with a `RotatingFileHandler`. See
`snippets/logging-config.py` for the drop-in module; the essentials:

```python
import logging
from logging.handlers import RotatingFileHandler

def configure_logging(app_name: str = "app", level: int = logging.INFO) -> None:
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    file_handler = RotatingFileHandler(
        log_dir / f"{app_name}.log",
        maxBytes=10 * 1024 * 1024,   # 10 MB
        backupCount=5,
    )
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)-5s [%(name)s] (%(threadName)s) %(message)s"
    ))

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)-5s %(message)s"))

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(file_handler)
    root.addHandler(console_handler)
```

Call `configure_logging()` once, at process startup, before any other module
calls `logging.getLogger(__name__)`.

## Structured JSON option

For machine parsing (log aggregation, or an agent that wants to `jq` the log),
swap the file handler's formatter for a JSON formatter:

```python
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)
```

Keep plain-text formatting as the default — it's what Claude Code greps most
naturally — and reserve JSON for when a downstream log pipeline needs it.

## Log directory convention

```
project-root/
├── logs/
│   ├── my-service.log              ← current
│   ├── my-service.log.1            ← rotated (RotatingFileHandler numeric suffix)
│   └── my-service.log.2
├── src/
└── pyproject.toml
```

Add `logs/` to `.gitignore`.

## Per-logger tuning

Reduce noise from frameworks and drivers, keep application logs verbose:

```python
logging.getLogger("aiokafka").setLevel(logging.WARNING)
logging.getLogger("asyncpg").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)
logging.getLogger("my_service").setLevel(logging.DEBUG)
```

## Logging under OpenTelemetry auto-instrumentation

`opentelemetry-instrument` injects trace and span IDs into the `logging`
module's `LogRecord` when log correlation is enabled, so the file formatter
can include them:

```python
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s %(levelname)-5s [%(name)s] "
    "(trace_id=%(otelTraceID)s span_id=%(otelSpanID)s) %(message)s"
))
```

Enable correlation with the environment variable
`OTEL_PYTHON_LOG_CORRELATION=true` before launching under
`opentelemetry-instrument`.

## Reading logs with Claude Code

After a failure, Claude Code can:
1. Read the log file directly: `Read logs/my-service.log`
2. Grep for errors: `grep -n 'ERROR\|WARNING\|Traceback' logs/my-service.log`
3. Tail the most recent entries for a still-running process: `tail -n 200 logs/my-service.log`

The structured format with timestamps, log levels, and logger names makes it
straightforward for an AI agent to identify the failure chain, including the
full traceback stdlib `logging` writes for uncaught exceptions logged with
`logger.exception(...)`.
