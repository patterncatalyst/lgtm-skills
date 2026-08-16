# Camel TUI

Terminal dashboard for developing, monitoring, and debugging Camel integrations.
Included with the Camel CLI — no separate install needed.

## Launch

```bash
camel tui
```

Automatically discovers and connects to running Camel integrations on the local
machine.

## Features

| Feature | Description |
|---|---|
| Route topology | Visual graph of route connections and message flow |
| Message tracing | Real-time trace of messages flowing through routes |
| Performance metrics | Exchange rate, processing time, error counts per route |
| Source editor | View and edit route source directly in the terminal |
| AI integration | Ask questions about running routes, get explanations |
| Health status | Route and context health at a glance |
| Log viewer | Integrated log tailing |

## When to use

- **During development** — monitor route behavior without switching to a browser
- **Over SSH** — works in remote terminals where a browser isn't available
- **In containers** — debug containerized Camel apps
- **In CI** — capture route state during integration test runs

## Complementary CLI commands

These work alongside the TUI for specific tasks:

```bash
camel ps                    # list running integrations
camel get                   # inspect integration details
camel log                   # tail logs from a specific integration
camel trace                 # trace messages (also available in TUI)
```

## vs. Camel MCP runtime tools

The TUI is interactive and visual — good for human monitoring during development.
The MCP runtime tools (`camel_runtime_*`) are programmatic — good for Claude Code
to inspect and control routes. Use both: TUI in one terminal, Claude Code with
MCP in another.
