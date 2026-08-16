#!/usr/bin/env bash
set -euo pipefail

# Export a Camel CLI prototype to a Quarkus Maven project.
# Usage: ./export-to-quarkus.sh [route-file] [output-dir]

ROUTE_FILE="${1:?Usage: $0 <route-file> [output-dir]}"
OUTPUT_DIR="${2:-.}"
GROUP_ID="${GROUP_ID:-com.example}"
ARTIFACT_ID="${ARTIFACT_ID:-$(basename "$ROUTE_FILE" .java | tr '[:upper:]' '[:lower:]')}"

echo "Exporting $ROUTE_FILE to Quarkus Maven project..."
echo "  Group:    $GROUP_ID"
echo "  Artifact: $ARTIFACT_ID"
echo "  Output:   $OUTPUT_DIR"

camel export \
    --runtime=quarkus \
    --gav="$GROUP_ID:$ARTIFACT_ID:1.0.0-SNAPSHOT" \
    --dir="$OUTPUT_DIR" \
    "$ROUTE_FILE"

echo ""
echo "Project exported. Next steps:"
echo "  cd $OUTPUT_DIR"
echo "  quarkus dev              # run in dev mode"
echo "  mvn test                 # run tests"
echo "  quarkus image build      # build container image"
