"""
diagrams.py — author your diagrams here, then run build_diagrams.py.

Each scene is a function that builds a Scene and calls .write().
Register every scene in the SCENES list at the bottom.

Paths (env, defaults): DIAG_DIR=./diagrams  PNG_DIR=./png
"""
from dgen import Scene, PALETTE


def example_request_flow():
    """A minimal example: client -> gateway -> service, with a callout."""
    s = Scene("r00-example-flow", width=1240, height=560,
              title="Example: one request through the edge",
              subtitle="Swap this scene for your own; keep the rNN-name convention.")
    s.box(80, 200, 240, 90, "Client", ["sends a request"], kind="svc")
    s.box(500, 200, 240, 90, "API gateway", ["authN / rate limit", "routes to service"], kind="rest")
    s.box(920, 200, 240, 90, "Service", ["does the work"], kind="platform")
    s.arrow(320, 245, 500, 245, kind="neutral", label="HTTPS")
    s.arrow(740, 245, 920, 245, kind="neutral")
    s.panel(80, 360, 1080, 110)
    s.label(104, 395, "Use color by role: svc=clients/services, rest=the API surface,",
            size=13, color=PALETTE["neutral"])
    s.label(104, 420, "data=stores, platform=infra, govern=policy, danger=failure paths.",
            size=13, color=PALETTE["neutral"])
    s.write()


# Register every scene here. build_diagrams.py runs them all.
SCENES = [
    example_request_flow,
]


if __name__ == "__main__":
    for fn in SCENES:
        fn()
        print(f"  built {fn.__name__}")
