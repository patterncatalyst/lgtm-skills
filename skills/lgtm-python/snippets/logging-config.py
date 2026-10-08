"""Structured file logging for Claude Code AI-assisted diagnosis.

Drop this module in as e.g. `src/<package>/logging_config.py` and call
`configure_logging()` once at process startup, before any other module
calls `logging.getLogger(__name__)`.
"""

from __future__ import annotations

import json
import logging
import logging.handlers
import os
from pathlib import Path

LOG_FORMAT = "%(asctime)s %(levelname)-5s [%(name)s] (%(threadName)s) %(message)s"
CONSOLE_FORMAT = "%(asctime)s %(levelname)-5s %(message)s"

# Trace/span correlation fields injected by opentelemetry-instrument when
# OTEL_PYTHON_LOG_CORRELATION=true. Fall back gracefully when absent.
CORRELATED_FORMAT = (
    "%(asctime)s %(levelname)-5s [%(name)s] "
    "(trace_id=%(otelTraceID)s span_id=%(otelSpanID)s) %(message)s"
)


class JsonFormatter(logging.Formatter):
    """Structured JSON formatter for machine parsing / log pipelines."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        trace_id = getattr(record, "otelTraceID", None)
        if trace_id and trace_id != "0":
            payload["trace_id"] = trace_id
            payload["span_id"] = getattr(record, "otelSpanID", None)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(
    app_name: str = "app",
    level: int = logging.INFO,
    log_dir: str | Path = "logs",
    json_format: bool = False,
    max_bytes: int = 10 * 1024 * 1024,
    backup_count: int = 5,
) -> None:
    """Wire stdlib logging to a rotating file plus console.

    Writes to ``logs/<app_name>.log`` (rotated to ``.1``, ``.2``, ... up to
    ``backup_count``) so Claude Code can read the log after a crash or test
    failure, even though the console output is gone.
    """
    directory = Path(log_dir)
    directory.mkdir(parents=True, exist_ok=True)

    correlation_enabled = os.environ.get("OTEL_PYTHON_LOG_CORRELATION", "").lower() == "true"
    file_format = CORRELATED_FORMAT if correlation_enabled else LOG_FORMAT

    file_handler = logging.handlers.RotatingFileHandler(
        directory / f"{app_name}.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
    )
    file_handler.setFormatter(JsonFormatter() if json_format else logging.Formatter(file_format))
    file_handler.setLevel(logging.DEBUG)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(CONSOLE_FORMAT))
    console_handler.setLevel(level)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    root.handlers.clear()
    root.addHandler(file_handler)
    root.addHandler(console_handler)

    # Quiet noisy third-party loggers; keep the app's own logger verbose.
    logging.getLogger("aiokafka").setLevel(logging.WARNING)
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger(app_name).setLevel(logging.DEBUG)


if __name__ == "__main__":
    configure_logging(app_name="example")
    logger = logging.getLogger("example")
    logger.info("logging configured")
    try:
        1 / 0
    except ZeroDivisionError:
        logger.exception("example failure for the log file")
