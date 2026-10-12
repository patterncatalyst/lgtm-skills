# Python / FastAPI idioms

Idiomatic FastAPI and Python for example and tutorial code. Authority:
`lgtm-python` (uv, Python 3.14, FastAPI/async service shapes, OTel, pytest+ruff)
and the FastAPI and Pydantic v2 docs. Severity tiers match the SKILL:
**reinvented** > **deprecated** > **structure** > **style**.

The guiding rule: let FastAPI and Pydantic do the validation, serialization,
dependency wiring, and lifecycle. Code that hand-parses the request body,
hand-builds the response dict, or manages its own singletons is usually
reinventing something the framework provides through a type annotation.

## Pydantic v2 models + `response_model` (reinvented / structure)

Declare request and response schemas as Pydantic v2 `BaseModel`s and let FastAPI
validate the input and shape the output. Set `response_model` (or the return type
annotation) so the response is filtered and documented. Do not accept a raw
`dict`/`Request` and validate fields by hand, and do not build the response dict
by hand.

```python
# before — hand-validated input, hand-built output
@app.post("/orders")
async def create(request: Request):
    body = await request.json()
    if "sku" not in body:
        raise HTTPException(400, "sku required")
    return {"id": new_id, "sku": body["sku"]}

# after — the model validates, response_model shapes
class OrderIn(BaseModel):
    sku: str
    qty: int = 1

class OrderOut(BaseModel):
    id: str
    sku: str

@app.post("/orders", response_model=OrderOut, status_code=201)
async def create(order: OrderIn) -> OrderOut:
    ...
```

Pydantic v2 in a v2 project: `model_config = ConfigDict(...)` not the v1 inner
`class Config`; `field_validator`/`model_validator` not v1 `@validator`;
`model_dump()`/`model_validate()` not `.dict()`/`.parse_obj()`. Mixed v1 APIs in
a v2 codebase are a deprecated-API finding.

## `lifespan` over `@app.on_event` (deprecated — `ban`)

Startup/shutdown go in a `lifespan` async context manager passed to `FastAPI()`.
`@app.on_event("startup")` / `@app.on_event("shutdown")` are deprecated. The
scanner flags `@app.on_event`.

```python
# before — deprecated
@app.on_event("startup")
async def startup():
    app.state.pool = await asyncpg.create_pool(DSN)

@app.on_event("shutdown")
async def shutdown():
    await app.state.pool.close()

# after — lifespan context manager
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(DSN)
    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)
```

## `APIRouter` composition (structure)

Split routes into `APIRouter`s by resource and `include_router` them, with
`prefix`/`tags`/`dependencies` on the router. One module with dozens of
`@app.get` decorators is non-idiomatic past a trivial example.

```python
# after
orders = APIRouter(prefix="/orders", tags=["orders"])

@orders.get("/{order_id}")
async def get(order_id: str): ...

app.include_router(orders)
```

## `Depends()` for dependency injection (reinvented / structure)

Shared resources — a DB pool, a settings object, the current user, a request-
scoped client — come through `Depends()`, not a module global reached by name and
not re-created per request. Dependencies are testable via
`app.dependency_overrides`.

```python
# before — module global, untestable
pool = None
@app.get("/orders")
async def list_orders():
    return await pool.fetch(...)

# after — injected, overridable in tests
async def get_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool

@app.get("/orders")
async def list_orders(pool: asyncpg.Pool = Depends(get_pool)):
    return await pool.fetch(...)
```

## `async def` vs `def` — don't block the loop, don't async everything (structure — subtle)

Use `async def` for a handler that `await`s real async I/O (asyncpg, aiokafka,
httpx async). Use plain `def` for genuinely synchronous work — FastAPI runs it in
a threadpool so it does not block the event loop. The anti-patterns are both
directions:

- `async def` that then does **blocking** I/O (`requests.get`, `time.sleep`, a
  sync DB driver, heavy CPU) — it blocks the single event loop for every request.
  Either make the call truly async, or make the handler `def`.
- `async def` wrapping work that has no `await` at all — misleading; it signals
  async where there is none.

```python
# before — async handler doing a blocking call: freezes the loop
@app.get("/rate")
async def rate():
    r = requests.get(UPSTREAM)      # blocking!
    return r.json()

# after — either an async client...
@app.get("/rate")
async def rate(client: httpx.AsyncClient = Depends(get_client)):
    r = await client.get(UPSTREAM)
    return r.json()

# ...or a sync handler FastAPI offloads to the threadpool
@app.get("/rate")
def rate():
    return requests.get(UPSTREAM).json()
```

## Streaming and background work (reinvented)

- Stream with `StreamingResponse` (or an SSE helper) over an async generator;
  do not buffer the whole body and send it at once when the point is streaming.
- Fire-after-response work uses `BackgroundTasks`; do not spawn an unawaited
  `asyncio.create_task` that the request scope may cancel, for the simple case.

## Errors → Problem via `HTTPException` / handlers (reinvented / structure)

Raise `HTTPException` (or a custom exception with a registered
`@app.exception_handler`) and emit a consistent RFC 9457 `problem+json` shape.
Do not `return JSONResponse(status_code=400, ...)` with an ad hoc error dict in
each handler, and never return a 200 with an `{"error": ...}` body.

## `pyproject.toml` + uv over `requirements.txt` (structure — `watch`)

This collection manages dependencies with uv: pin in `pyproject.toml`, commit
`uv.lock`. A `requirements.txt` in a project that is otherwise uv-managed is a
finding (the scanner flags its presence as `watch` — a pip-only legacy sample is
a legitimate exception, so confirm before acting).

## No bare `except:` (`ban`)

A bare `except:` (or `except Exception` that swallows and continues silently)
hides failures and catches `KeyboardInterrupt`/`SystemExit`. Catch the specific
exception; if you must catch broadly, log it and re-raise or handle it
explicitly. The scanner flags bare `except:`.

```python
# before
try: risky()
except: pass

# after
try: risky()
except ValueError as e:
    logger.warning("skipping bad record: %s", e)
```

## `logging` over `print` (style — `ban` in app code)

Application and service code logs through the stdlib `logging` module (wired to
the rotating file handler the scaffold provides), not `print()`. `print` is fine
in a `__main__` CLI block or a script whose job is stdout. The scanner flags
`print(` in Python files; triage CLI entrypoints by hand.

## Type hints (style)

Public functions, handlers, and models carry type hints — they drive FastAPI's
validation and docs, and ruff/mypy check them. Untyped handler parameters mean no
validation and no schema. Add hints; do not churn a file that is already typed.
