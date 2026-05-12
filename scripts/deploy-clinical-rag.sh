#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-dante-clinical-rag-api}"
AWS_REGION="${AWS_REGION:-us-east-2}"
AWS_PROFILE="${AWS_PROFILE:-dante_nv}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"
CLINICAL_RAG_USE_LLM="${CLINICAL_RAG_USE_LLM:-false}"
CLINICAL_RAG_CHAT_MODEL="${CLINICAL_RAG_CHAT_MODEL:-gpt-4.1-nano}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_DIR="${ROOT_DIR}/infra/clinical-rag-api"
cd "${STACK_DIR}"

usage() {
  cat <<'USAGE'
Deploy the clinical RAG API stack.

Usage:
  ./scripts/deploy-clinical-rag.sh --allowed-origins <csv> [options]

Options:
  --stack-name <name>
  --region <region>
  --profile <profile>
  --allowed-origins <csv>
  --use-llm <true|false>
  --chat-model <model>
  --help
USAGE
}

fail() {
  echo "error: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack-name)
      STACK_NAME="${2:-}"
      shift 2
      ;;
    --region)
      AWS_REGION="${2:-}"
      shift 2
      ;;
    --profile)
      AWS_PROFILE="${2:-}"
      shift 2
      ;;
    --allowed-origins)
      ALLOWED_ORIGINS="${2:-}"
      shift 2
      ;;
    --use-llm)
      CLINICAL_RAG_USE_LLM="${2:-}"
      shift 2
      ;;
    --chat-model)
      CLINICAL_RAG_CHAT_MODEL="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

if [[ -z "${ALLOWED_ORIGINS}" ]]; then
  fail "ALLOWED_ORIGINS is required (comma-separated list)."
fi

echo "info: Building SAM template..."
sam build --template-file template.yaml

BUILT_TEMPLATE=".aws-sam/build/template.yaml"
[[ -f "${BUILT_TEMPLATE}" ]] || fail "Built template not found at ${BUILT_TEMPLATE}"

echo "info: Deploying stack ${STACK_NAME} in ${AWS_REGION} (${AWS_PROFILE})..."
sam deploy \
  --template-file "${BUILT_TEMPLATE}" \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --profile "${AWS_PROFILE}" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides \
    "AllowedOrigins=${ALLOWED_ORIGINS}" \
    "ClinicalRagUseLlm=${CLINICAL_RAG_USE_LLM}" \
    "ClinicalRagChatModel=${CLINICAL_RAG_CHAT_MODEL}"

echo "info: Deploy complete."
aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --profile "${AWS_PROFILE}" \
  --query "Stacks[0].Outputs[?OutputKey=='ClinicalRagAskApiUrl'].OutputValue | [0]" \
  --output text

