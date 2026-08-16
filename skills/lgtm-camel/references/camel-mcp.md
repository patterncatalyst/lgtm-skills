# Camel MCP Server

Exposes the Camel catalog, route validation, runtime inspection, migration tools,
and OpenAPI scaffolding to Claude Code via the Model Context Protocol.

## Installation

```bash
claude mcp add -s user camel-mcp -- jbang -Dcamel.mcp.transport=stdio camel mcp
```

Or in `.mcp.json` (project scope):

```json
{
  "mcpServers": {
    "camel-mcp": {
      "type": "stdio",
      "command": "jbang",
      "args": ["-Dcamel.mcp.transport=stdio", "camel", "mcp"]
    }
  }
}
```

## Tools by category

### Catalog — look up components, EIPs, data formats

| Tool | Description |
|---|---|
| `camel_catalog_components` | List all available Camel components |
| `camel_catalog_component_doc` | Get documentation for a component |
| `camel_catalog_component_maven` | Get Maven coordinates for a component |
| `camel_component_properties` | Get all properties/options for a component |
| `camel_catalog_eips` | List Enterprise Integration Patterns |
| `camel_catalog_eip_doc` | Get documentation for an EIP |
| `camel_catalog_dataformats` | List data formats |
| `camel_catalog_dataformat_doc` | Get data format documentation |
| `camel_catalog_languages` | List expression languages |
| `camel_catalog_language_doc` | Get language documentation |
| `camel_catalog_kamelets` | List Kamelets |
| `camel_catalog_kamelet_doc` | Get Kamelet documentation |
| `camel_catalog_examples` | List available examples |
| `camel_catalog_example_file` | Get an example file |
| `camel_version_list` | List available Camel versions |

### Validation — check routes before running

| Tool | Description |
|---|---|
| `camel_validate_route` | Validate a route definition for endpoint/option errors |
| `camel_validate_yaml_dsl` | Check YAML DSL structural errors |
| `camel_configuration_validate` | Validate configuration properties |
| `camel_dependency_check` | Check dependency resolution |

### Route tools — analyze, transform, scaffold

| Tool | Description |
|---|---|
| `camel_route_context` | Get context about a route (components, EIPs used) |
| `camel_route_harden_context` | Get security hardening suggestions for a route |
| `camel_route_test_scaffold` | Generate a test skeleton for a route |
| `camel_transform_route` | Transform a route between DSLs (Java ↔ YAML ↔ XML) |
| `camel_render_route_diagram` | Generate a visual route diagram |
| `camel_properties_translate` | Translate properties between formats |

### Runtime — inspect and control running integrations

| Tool | Description |
|---|---|
| `camel_runtime_context` | Get CamelContext info |
| `camel_runtime_routes` | List running routes |
| `camel_runtime_route_control` | Start/stop/suspend routes |
| `camel_runtime_route_dump` | Dump route definition |
| `camel_runtime_route_source` | Get route source code |
| `camel_runtime_route_structure` | Get route structure |
| `camel_runtime_route_topology` | Get route topology |
| `camel_runtime_endpoints` | List endpoints |
| `camel_runtime_consumers` | List consumers |
| `camel_runtime_services` | List services |
| `camel_runtime_health` | Check health |
| `camel_runtime_history` | Route history |
| `camel_runtime_top` | Top-like performance view |
| `camel_runtime_inflight` | In-flight exchanges |
| `camel_runtime_blocked` | Blocked exchanges |
| `camel_runtime_trace` | Message tracing |
| `camel_runtime_errors` | Recent errors |
| `camel_runtime_variables` | Route variables |
| `camel_runtime_properties` | Configuration properties |
| `camel_runtime_memory` | Memory usage |
| `camel_runtime_processes` | Running processes |
| `camel_runtime_thread_dump` | Thread dump |
| `camel_runtime_send` | Send a message to an endpoint |
| `camel_runtime_receive` | Receive a message from an endpoint |
| `camel_runtime_browse` | Browse an endpoint |
| `camel_runtime_eval` | Evaluate an expression |
| `camel_runtime_stop` | Stop the runtime |

### Migration — upgrade and migrate Camel versions

| Tool | Description |
|---|---|
| `camel_migration_analyze` | Analyze code for migration issues |
| `camel_migration_compatibility` | Check compatibility between versions |
| `camel_migration_guide_search` | Search migration guides |
| `camel_migration_recipes` | Get migration recipes (OpenRewrite) |
| `camel_migration_wildfly_karaf` | Migration from WildFly/Karaf |

### OpenAPI — generate and validate API-first routes

| Tool | Description |
|---|---|
| `camel_openapi_scaffold` | Generate Camel routes from an OpenAPI spec |
| `camel_openapi_validate` | Validate an OpenAPI spec |
| `camel_openapi_mock_guidance` | Get guidance on mocking an API |

### Error diagnosis

| Tool | Description |
|---|---|
| `camel_error_diagnose` | Parse and diagnose Camel error messages |

## Development workflow with MCP

```
Write route (Java DSL)
    │
    ▼
camel_validate_route              ← catch invalid URIs/options
    │
    ▼
camel_route_test_scaffold         ← generate test skeleton
    │
    ▼
mvn test                          ← run unit tests
    │
    ▼
camel_error_diagnose              ← parse failures if tests fail
    │
    ▼
camel_runtime_routes              ← verify route started in dev mode
    │
    ▼
camel_runtime_trace               ← trace messages through the route
```
