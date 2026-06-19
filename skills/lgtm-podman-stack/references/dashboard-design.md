# Dashboard Design Patterns

Principles for building Grafana dashboards that work, hold up over time, and don't become a wall of disconnected panels.

This document doesn't ship specific dashboards. It documents the patterns to apply when creating new ones.

## Start with a question, not a metric

The best dashboards answer questions. The worst dashboards display every metric you have.

When designing a new dashboard, write down the question first:

- "Is our checkout flow healthy right now?"
- "Why is the user-service slow this morning?"
- "Are we approaching capacity limits?"
- "Which deployments correlate with error rate changes?"

Each panel should help answer the question. Panels that don't get removed.

A dashboard with 30 panels usually means 30 unanswered questions glued together. Better to make three focused dashboards than one comprehensive one nobody reads.

## The four-zone layout

For service-health dashboards, a reliable layout:

```
┌─────────────────────────────────────────────────┐
│  Top row: at-a-glance health (stat panels)      │   "is something on fire right now"
│  • Request rate    • Error rate   • p99 latency │
├─────────────────────────────────────────────────┤
│  Second row: trends (time-series, last 1h)      │   "is the situation getting better or worse"
│  • Latency over time  • Error rate over time    │
├─────────────────────────────────────────────────┤
│  Third row: drill-downs (by-route breakdowns)   │   "where is the problem coming from"
│  • Latency by route   • Errors by route         │
├─────────────────────────────────────────────────┤
│  Bottom: infrastructure (heap, CPU, etc.)       │   "is the runtime healthy"
│  • Memory     • CPU   • Connections             │
└─────────────────────────────────────────────────┘
```

Reading top-to-bottom answers progressively detailed questions. The on-call engineer scans the top row first; if something's wrong, they scroll down.

## Use templating for service and instance

Almost every panel should use `$service` and `$instance` variables. Define them at the top of the dashboard:

```
Variable: service
  Label: Service
  Query: label_values(http_server_duration_milliseconds_count, service_name)

Variable: instance
  Label: Instance
  Query: label_values(http_server_duration_milliseconds_count{service_name="$service"}, instance)
```

Now your dashboard works for every service, not just the one it was built for. Adding a new service requires zero dashboard changes.

## Latency: histograms over averages

**Bad:**

```promql
avg(http_server_duration_milliseconds_count)
```

Average latency hides everything important. A service with p50=10ms and p99=2000ms has a misleading average. The slow tail is what wakes people up at 3 AM.

**Good:**

```promql
histogram_quantile(0.99, sum(rate(http_server_duration_milliseconds_bucket[5m])) by (le))
```

Show p50, p95, p99 separately. Each is a different panel or a stacked chart.

For latency to be queryable as histograms, the application must export histogram metrics. OTel SDKs do this by default; if your service exports `latency_milliseconds` as a gauge, you need to fix the instrumentation.

## Error rate: ratio over count

**Bad:**

```promql
sum(rate(http_server_errors_total[5m]))
```

Raw error count is misleading. 100 errors/sec is fine if you're doing 10,000 requests/sec. It's a disaster if you're doing 100 requests/sec.

**Good:**

```promql
sum(rate(http_server_duration_milliseconds_count{status_code=~"5.."}[5m])) /
sum(rate(http_server_duration_milliseconds_count[5m]))
```

Error *rate* (proportion). Alertable on percentage rather than absolute count.

## Use exemplars to link metrics to traces

Histograms in Prometheus / Mimir can carry **exemplars** — pointers to specific trace IDs that contributed to a bucket. Grafana renders them as dots on the histogram. Click a dot and jump to the trace.

For this to work:

1. Instrument the application to emit exemplars (most OTel SDKs do this automatically when traces are sampled)
2. Configure the metrics backend to store exemplars
3. Configure the Grafana datasource (`exemplarTraceIdDestinations`) — see the datasources template

When working, "why is the p99 latency spiking?" becomes a one-click investigation: click a high-latency exemplar dot, see the slow trace, see why it was slow.

## Trace-to-logs and logs-to-trace links

Grafana datasource provisioning (see `templates/grafana-datasources.yaml`) sets up:

- **Tempo → Loki**: From a trace, jump to logs containing the same `trace_id`
- **Loki → Tempo**: From a log line containing `trace_id=...`, jump to the trace

These links are dashboard-independent — they work in Grafana Explore once provisioned. But when designing dashboards, you can also embed trace-finding queries:

```
Panel type: Logs
Query: {service_name="$service"} | json | trace_id != ""
```

Now the dashboard itself shows logs with trace IDs, each clickable to navigate to Tempo.

## Stat panels and thresholds

Top-row stat panels should have thresholds. Numbers without context are useless; numbers with green/yellow/red bands tell a story:

```
Panel: Error rate
Query: rate(errors[5m]) / rate(total[5m]) * 100
Unit: percent
Thresholds:
  green:  0
  yellow: 1
  red:    5
```

Now the engineer sees "3.4% error rate" against a yellow background and immediately knows that's elevated but not catastrophic.

## Time ranges matter

Default time range affects what people perceive. Some defaults:

| Dashboard type | Default time range |
|---|---|
| Service health (real-time) | Last 15 minutes |
| Incident investigation | Last 1 hour |
| Daily review | Last 24 hours |
| Capacity planning | Last 7 days |
| Trend analysis | Last 30 days |

A dashboard with a 30-day default time range fetches massive datasets on every load. Slow to load, expensive to compute. Don't.

## Annotation queries

Annotations show events overlaid on dashboards — deploys, incidents, marketing campaigns. They're invaluable for correlation:

```
Annotation: Deployments
Datasource: Prometheus
Query: changes(build_info{service_name="$service"}[5m]) > 0
```

Now every deploy of the service shows as a vertical line on every panel. The "did the latency spike start at the same time as that deploy?" question becomes visually obvious.

## What to avoid

- **Too many panels.** If you have to scroll to see them all, split into multiple dashboards.
- **Stacked area charts of 10+ series.** Unreadable. Use a different visualization.
- **Pie charts.** Almost never the right choice for telemetry.
- **Dashboards built for one specific incident.** Generalize them or delete them after the incident.
- **Dashboards with no clear owner.** Stale dashboards mislead. Either own them or remove them.

## Versioning dashboards

Grafana dashboards can be exported as JSON and committed to git. Treat them as code:

1. Edit the dashboard in Grafana
2. Export JSON (Dashboard settings → JSON model)
3. Commit to `grafana/dashboards/*.json`
4. Optionally provision via Grafana's dashboard provisioning

Changes are tracked, reviewable, and reproducible. Lost dashboards become a thing of the past.
