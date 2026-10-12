# Go idioms

Idiomatic Go 1.27, standard library first, for example and tutorial code.
Authority: `lgtm-docker-stack` (`snippets/instrumentation-go.md`: OTel SDK setup,
`otelhttp`, slog correlation, testcontainers-go), the Go release notes, Effective
Go, and the package docs on pkg.go.dev. Severity tiers match the SKILL:
**reinvented** > **deprecated** > **structure** > **style**.

The guiding rule: idiomatic Go is plain. The standard library covers routing,
structured logging, signals, and graceful shutdown; a framework or ORM needs a
reason. Unlike Spring or ASP.NET Core, a hand-written `/healthz` handler and
hand-written SQL are the idiom here, not a reinvention.

## `http.Server` + `signal.NotifyContext` + `Shutdown` (reinvented / structure)

Run an `http.Server` with timeouts, stop on `signal.NotifyContext`, and drain with
`Shutdown` bounded by a context. Package-level `http.ListenAndServe` has no
timeouts and no way to drain; a hand-rolled `signal.Notify` channel plus a flag
re-implements `NotifyContext`.

```go
// before
http.ListenAndServe(":8080", mux)

// after
srv := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second}
ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
defer stop()
go func() {
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        slog.Error("serve", "err", err); os.Exit(1)
    }
}()
<-ctx.Done()
shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil { slog.Error("shutdown", "err", err) }
```

## `ServeMux` method and wildcard patterns (deprecated habit / structure)

Since Go 1.22 the standard mux matches methods and path wildcards. A router
dependency, or a handler that switches on `r.Method` and splits `r.URL.Path`, is
the reinvention for ordinary REST routing.

```go
// before
mux.HandleFunc("/orders/", func(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet { w.WriteHeader(405); return }
    id := strings.TrimPrefix(r.URL.Path, "/orders/")
    ...
})

// after
mux.HandleFunc("GET /orders/{id}", s.getOrder)   // id := r.PathValue("id")
```

## Context propagation (structure)

Pass `r.Context()` (or the caller's `ctx`) as the first argument down to pgx,
outbound HTTP, Kafka, and OTel calls. `context.Background()` inside a handler
drops cancellation and the trace. Do not store a context in a struct.

## Errors: wrap with `%w`, inspect with `errors.Is` / `errors.AsType` (structure)

Add context with `fmt.Errorf("reserve %s: %w", sku, err)`; compare with
`errors.Is(err, pgx.ErrNoRows)`, never `err == ...` on a wrapped error or a string
match on `err.Error()`. Go 1.26 adds generic `errors.AsType[T]`; `errors.As` still
works. Return errors; `panic` is for programmer errors, and `log.Fatal` belongs
only in `main`.

```go
// before
if err.Error() == "no rows in result set" { ... }
var pgErr *pgconn.PgError
if errors.As(err, &pgErr) && pgErr.Code == "23505" { ... }

// after
if errors.Is(err, pgx.ErrNoRows) { ... }
if pgErr, ok := errors.AsType[*pgconn.PgError](err); ok && pgErr.Code == "23505" { ... }
```

## Structured logging with `log/slog` (style)

`slog` with key-value attributes, a JSON handler in containers, and trace IDs
added per `lgtm-docker-stack`. `log.Printf` and `fmt.Println` in service code are
findings; `fmt.Print*` is correct in a CLI whose stdout is the interface.

## pgx v5: `pgxpool` and `CollectRows` (reinvented)

Use one `pgxpool.Pool` created in `main` and passed down. Collect rows with
`pgx.CollectRows` and `pgx.RowToStructByName` instead of a `rows.Next()` loop
that scans field by field, and never `continue` past a scan error.

```go
// before
for rows.Next() {
    var o order
    if err := rows.Scan(&o.ID, &o.SKU, &o.Quantity, &o.Status); err != nil { continue }
    orders = append(orders, o)
}

// after
// a Query error surfaces from CollectRows, as in the pgx docs
rows, _ := s.pool.Query(ctx, "SELECT id, sku, quantity, status FROM orders ORDER BY created_at DESC LIMIT 50")
orders, err := pgx.CollectRows(rows, pgx.RowToStructByName[order])
if err != nil { return fmt.Errorf("list orders: %w", err) }
```

`CollectRows` closes the rows and returns the iteration error, which the manual
loop above never checked (`rows.Err()`).

## Plain SQL, not an ORM by default (structure)

Idiomatic Go data access is SQL through the driver, or SQL compiled to typed Go
with `sqlc`. Adding an ORM to an example that runs four queries adds a dependency
and hides the SQL the reader came to see. Do not flag plain SQL; flag string
concatenation into SQL (use `$1` parameters).

## Small interfaces, defined by the consumer (structure)

Accept interfaces, return structs. Declare the one- or two-method interface in
the package that uses it (`type OrderStore interface { Save(ctx, Order) error }`),
not a large interface next to its only implementation. Hexagonal-architecture
ports are the legitimate case for a named interface in the domain package.

## Goroutines and their lifetimes (structure)

- Every goroutine has an owner that waits for it: `errgroup.Group`
  (`golang.org/x/sync/errgroup`, with `SetLimit` for bounded fan-out) when errors
  matter, `sync.WaitGroup.Go` (Go 1.25) otherwise.
- A goroutine blocked on a channel nobody closes, or a loop without a
  `ctx.Done()` case, is a leak.
- `time.NewTicker` gets `defer t.Stop()`; select on `ctx.Done()` alongside it.

```go
g, ctx := errgroup.WithContext(ctx)
for _, sku := range skus {
    g.Go(func() error { return s.reserve(ctx, sku) })
}
if err := g.Wait(); err != nil { return err }
```

## Package initialization (structure)

No `init()` with side effects (opening pools, reading env, registering global
state). Build dependencies in `main` and pass them; configuration comes from
flags or environment read once in `main`.

## Tests (structure)

Table-driven tests with `t.Run` subtests; `t.Context()` (Go 1.24) for a context
cancelled at test end; `testing/synctest` for time-dependent code instead of real
sleeps; testcontainers-go for Postgres and Kafka per `lgtm-docker-stack`.

## Generics only where they help (style)

Use type parameters for container-like helpers and functions that are otherwise
duplicated per type (`slices`, `maps`, a `CollectRows`-style helper). A generic
repository or service layer that wraps one type is abstraction without payoff.

## Deprecated (deprecated)

| Before | After |
|--------|-------|
| `io/ioutil` | `io.ReadAll`, `os.ReadFile`, `os.WriteFile`, `os.MkdirTemp` |
| `rand.Seed`, global `math/rand` | `math/rand/v2` (seeded automatically) |
| `interface{}` | `any` |
| `httputil.ReverseProxy.Director` (Go 1.26) | `ReverseProxy.Rewrite` with `ProxyRequest.SetURL` |
| hand-applied API migrations | `go fix ./...` (Go 1.26 modernizers) |

Gate on `gofmt`, `go vet`, and `staticcheck`; run `govulncheck` before release.

## Do not flag

- Hand-written `/healthz` and `/readyz` handlers: the standard library has no
  health framework, so this is the idiom.
- Plain SQL through pgx or `database/sql`.
- `fmt.Print*` in a CLI adapter whose stdout a test reads.
- `interface{}` in generated code (`*.pb.go`, `*_grpc.pb.go`); the scanner skips
  `*.pb.go` already.
- Known-bad inputs in negative tests.
