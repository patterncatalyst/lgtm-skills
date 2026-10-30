# Library mode — local-only, pure-language Python

The **library mode** is the local-only, no-containers path for pure-language Python
work: books, libraries, CLIs, and the design-patterns material. It is the Python
sibling of `lgtm-csharp` and `lgtm-cpp` — toolchain and tests on the local machine,
nothing more.

Use it when the project is **not a service**. If the project exposes HTTP/gRPC/Kafka,
needs observability, or ships a container, use the default **service mode** (the rest
of this skill) instead.

## Platform policy: local tools, no containers

- **No containers.** No `Containerfile`, no Dockerfile, no Testcontainers. The
  `templates/Containerfile` and the integration-test layer do not apply in this mode.
  State this plainly when a user expects a container path: there is not one here.
- **No observability stack.** No OpenTelemetry, no `opentelemetry-distro`, no OTLP
  export. A library is imported, not traced. Logging, when a CLI needs it, is the
  stdlib `logging` rotating-file setup from `references/logging.md` — nothing more.
- **No service dependencies.** No FastAPI, grpcio, Strawberry, aiokafka, or asyncpg
  unless the library genuinely wraps one, and then only as a pinned dependency, never
  as scaffolding.
- **Editors: VS Code or PyCharm,** both CLI-driven. Every build, test, and check is a
  `uv run ...` command, so a contributor with only uv and a text editor can follow
  along.

## The toolchain (same uv, trimmed set)

| Concern | Tool | Notes |
|---|---|---|
| Env + deps + interpreter | **uv** (Python 3.14) | same as service mode; the single tool |
| Tests | **pytest** | the house test framework |
| Mocking | **pytest-mock** (`mocker`) / `unittest.mock` | the mock seam for testing patterns |
| Lint + format | **ruff** | `ruff check` + `ruff format` |
| Type checking | **mypy `--strict`** | the build gate — the analog of C# nullable-as-errors and C++ warnings-as-errors |

No Testcontainers, no Newman, no kcat — those are the service-mode integration layers.

## Project layout

```
pyproject.toml           uv project + [tool.pytest] + [tool.ruff] + [tool.mypy]
src/<package>/           importable package code (src layout)
  __init__.py
tests/
  test_*.py              pytest + pytest-mock, no markers, no services
scripts/check-prereqs.sh toolchain gate (uv, python, ruff, mypy, git)
```

Use the **src layout** (`src/<package>/`) so tests run against the installed package,
not the working directory — it catches packaging mistakes a flat layout hides.

## Commands

```bash
uv sync                       # create the env from pyproject + uv.lock
uv run pytest                 # run the suite
uv run pytest -k Strategy     # a subset by name
uv run ruff check .           # lint
uv run ruff format --check .  # format gate
uv run mypy --strict src tests   # type gate (fails on any untyped/Any leak)
./scripts/check-prereqs.sh    # toolchain gate
```

Wire these into CI as separate steps so a type error, a lint error, and a test
failure each report distinctly.

## mypy strict is the quality gate

Mirror what nullable-reference-types do for the .NET book and warnings-as-errors do
for the C++ book: make the type checker fail the build. Put it in `pyproject.toml`
(see `snippets/pyproject-library.toml`):

```toml
[tool.mypy]
python_version = "3.14"
strict = true
warn_unreachable = true
warn_redundant_casts = true
files = ["src", "tests"]
```

`strict` turns on `disallow_untyped_defs`, `disallow_any_generics`,
`no_implicit_optional`, and the rest. New code is fully typed from the first line; a
possible-`None` or an untyped function fails `mypy`, not a test.

## Testing the patterns (pytest + pytest-mock)

The design-patterns book tests patterns by mocking their collaborators — the Strategy
a context delegates to, the Subject an Observer watches. `pytest-mock`'s `mocker`
fixture is the clean seam:

```python
def test_booking_picks_cheapest_carrier(mocker):
    gateway = mocker.Mock()
    gateway.quote.side_effect = [42, 39]        # acme, globex

    booking = Booking(gateway)

    assert booking.cheapest_quote(weight=10) == 39
    assert gateway.quote.call_count == 2
```

Prefer `Protocol`-typed collaborators so a plain `Mock` (or a hand-written fake)
satisfies the type without inheritance — structural typing is the idiomatic Python
seam, and it keeps `mypy --strict` happy.

## Idiomatic Python

Favour the language over machinery ported from other languages: `Protocol`/duck
typing over interface hierarchies, dataclasses, context managers, decorators,
`functools.singledispatch`, generators for Iterator, and plain callables for
Strategy/Command. When a GoF pattern is redundant in Python (Singleton via a module,
Strategy via a callable), say so rather than reproducing the Java shape. Run
`lgtm-idiomatic-review` (Python rules) before release.
