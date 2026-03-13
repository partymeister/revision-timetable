#!/usr/bin/env bash
set -euo pipefail

# Deploy k8s secrets for revision-timetable
#
# Usage:
#   ./deploy-k8s-secrets.sh --service-account /path/to/service-account.json --webhook-secret <secret>
#   ./deploy-k8s-secrets.sh --force   # recreate existing secret
#   ./deploy-k8s-secrets.sh --dry-run # preview without applying

NAMESPACE="tum-revision"
SECRET_NAME="revision-timetable-secrets"
FORCE=false
DRY_RUN=false
SERVICE_ACCOUNT_FILE=""
WEBHOOK_SECRET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service-account) SERVICE_ACCOUNT_FILE="$2"; shift 2 ;;
    --webhook-secret) WEBHOOK_SECRET="$2"; shift 2 ;;
    --force) FORCE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [ -z "$SERVICE_ACCOUNT_FILE" ] || [ -z "$WEBHOOK_SECRET" ]; then
  echo "Usage: $0 --service-account <path> --webhook-secret <secret> [--force] [--dry-run]"
  exit 1
fi

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
  echo "Error: Service account file not found: $SERVICE_ACCOUNT_FILE"
  exit 1
fi

if $FORCE; then
  echo "Deleting existing secret (if any)..."
  $DRY_RUN || kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found
fi

CMD="kubectl create secret generic $SECRET_NAME \
  --namespace=$NAMESPACE \
  --from-file=service-account.json=$SERVICE_ACCOUNT_FILE \
  --from-literal=WEBHOOK_SECRET=$WEBHOOK_SECRET"

if $DRY_RUN; then
  echo "[dry-run] Would run:"
  echo "  $CMD"
else
  eval "$CMD"
  kubectl label secret "$SECRET_NAME" -n "$NAMESPACE" app=revision-timetable --overwrite
  echo "Secret '$SECRET_NAME' created in namespace '$NAMESPACE'"
fi
