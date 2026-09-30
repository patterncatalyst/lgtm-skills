# flagd — OpenFeature flag evaluation daemon

flagd is a lightweight flag evaluation daemon that implements the OpenFeature
Remote Evaluation Protocol. Application services connect via gRPC (port 8013)
using an OpenFeature SDK.

## Compose service

```yaml
flagd:
  image: ghcr.io/open-feature/flagd:latest
  container_name: flagd
  ports:
    - "8013:8013"
  volumes:
    - ./flags/config.yaml:/etc/flagd/config.yaml:Z
  command: start --uri file:/etc/flagd/config.yaml
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:8014/healthz"]
    interval: 5s
    timeout: 3s
    retries: 12
    start_period: 5s
```

## Sample flag configuration

Place at `flags/config.yaml`:

```yaml
flags:
  new-checkout-flow:
    state: ENABLED
    variants:
      "on": true
      "off": false
    defaultVariant: "off"
    targeting:
      if:
        - in:
            - var: email
            - ["beta@example.com", "test@example.com"]
        - "on"
        - "off"

  order-limit:
    state: ENABLED
    variants:
      low: 10
      high: 100
    defaultVariant: low
```

## SDK connection

Application services connect to flagd via the OpenFeature SDK:

```python
# Python
from openfeature import api
from openfeature.contrib.provider.flagd import FlagdProvider

api.set_provider(FlagdProvider(host="flagd", port=8013))
client = api.get_client()
enabled = client.get_boolean_value("new-checkout-flow", False)
```

```go
// Go
import (
    "github.com/open-feature/go-sdk/openfeature"
    flagd "github.com/open-feature/go-sdk-contrib/providers/flagd/pkg"
)

provider := flagd.NewProvider(flagd.WithHost("flagd"), flagd.WithPort(8013))
openfeature.SetProvider(provider)
client := openfeature.NewClient("my-app")
enabled, _ := client.BooleanValue(ctx, "new-checkout-flow", false, openfeature.EvaluationContext{})
```

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 8013 | gRPC | Flag evaluation (OpenFeature Remote Evaluation Protocol) |
| 8014 | HTTP | Management API + health (`/healthz`) |
