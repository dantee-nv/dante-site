#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-dante-paper-search-api}"
AWS_REGION="${AWS_REGION:-us-east-2}"
AWS_PROFILE="${AWS_PROFILE:-dante_nv}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"
BEDROCK_REGION="${BEDROCK_REGION:-us-east-2}"
BEDROCK_EMBED_MODEL_ID="${BEDROCK_EMBED_MODEL_ID:-amazon.titan-embed-text-v2:0}"
SEMANTIC_SCHOLAR_BASE_URL="${SEMANTIC_SCHOLAR_BASE_URL:-https://api.semanticscholar.org}"
SEMANTIC_SCHOLAR_API_KEY="${SEMANTIC_SCHOLAR_API_KEY:-}"
CANDIDATE_LIMIT="${CANDIDATE_LIMIT:-100}"
MAX_CONTEXT_CHARS="${MAX_CONTEXT_CHARS:-8000}"
MAX_K="${MAX_K:-10}"
PAPER_EMBEDDING_TTL_DAYS="${PAPER_EMBEDDING_TTL_DAYS:-30}"
RATE_LIMIT_PER_MINUTE="${RATE_LIMIT_PER_MINUTE:-20}"
CIRCUIT_BREAKER_THRESHOLD="${CIRCUIT_BREAKER_THRESHOLD:-3}"
CIRCUIT_BREAKER_OPEN_SECONDS="${CIRCUIT_BREAKER_OPEN_SECONDS:-30}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_DIR="${ROOT_DIR}/infra/paper-search-api"
cd "${STACK_DIR}"

usage() {
  cat <<'USAGE'
Deploy the paper search API stack.

Usage:
  ./scripts/deploy-paper-search.sh [options]

Options:
  --stack-name <name>
  --region <region>
  --profile <profile>
  --allowed-origins <csv>
  --bedrock-region <region>
  --bedrock-model-id <model-id>
  --semantic-scholar-base-url <url>
  --semantic-scholar-api-key <key>
  --candidate-limit <n>
  --max-context-chars <n>
  --max-k <n>
  --paper-embedding-ttl-days <n>
  --rate-limit-per-minute <n>
  --circuit-breaker-threshold <n>
  --circuit-breaker-open-seconds <n>
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
    --bedrock-region)
      BEDROCK_REGION="${2:-}"
      shift 2
      ;;
    --bedrock-model-id)
      BEDROCK_EMBED_MODEL_ID="${2:-}"
      shift 2
      ;;
    --semantic-scholar-base-url)
      SEMANTIC_SCHOLAR_BASE_URL="${2:-}"
      shift 2
      ;;
    --semantic-scholar-api-key)
      SEMANTIC_SCHOLAR_API_KEY="${2:-}"
      shift 2
      ;;
    --candidate-limit)
      CANDIDATE_LIMIT="${2:-}"
      shift 2
      ;;
    --max-context-chars)
      MAX_CONTEXT_CHARS="${2:-}"
      shift 2
      ;;
    --max-k)
      MAX_K="${2:-}"
      shift 2
      ;;
    --paper-embedding-ttl-days)
      PAPER_EMBEDDING_TTL_DAYS="${2:-}"
      shift 2
      ;;
    --rate-limit-per-minute)
      RATE_LIMIT_PER_MINUTE="${2:-}"
      shift 2
      ;;
    --circuit-breaker-threshold)
      CIRCUIT_BREAKER_THRESHOLD="${2:-}"
      shift 2
      ;;
    --circuit-breaker-open-seconds)
      CIRCUIT_BREAKER_OPEN_SECONDS="${2:-}"
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

PARAMS=(
  "AllowedOrigins=${ALLOWED_ORIGINS}"
  "BedrockRegion=${BEDROCK_REGION}"
  "BedrockEmbedModelId=${BEDROCK_EMBED_MODEL_ID}"
  "SemanticScholarBaseUrl=${SEMANTIC_SCHOLAR_BASE_URL}"
  "CandidateLimit=${CANDIDATE_LIMIT}"
  "MaxContextChars=${MAX_CONTEXT_CHARS}"
  "MaxK=${MAX_K}"
  "PaperEmbeddingTtlDays=${PAPER_EMBEDDING_TTL_DAYS}"
  "RateLimitPerMinute=${RATE_LIMIT_PER_MINUTE}"
  "CircuitBreakerThreshold=${CIRCUIT_BREAKER_THRESHOLD}"
  "CircuitBreakerOpenSeconds=${CIRCUIT_BREAKER_OPEN_SECONDS}"
)

if [[ -n "${SEMANTIC_SCHOLAR_API_KEY}" ]]; then
  PARAMS+=("SemanticScholarApiKey=${SEMANTIC_SCHOLAR_API_KEY}")
fi

sam deploy \
  --template-file "${BUILT_TEMPLATE}" \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --profile "${AWS_PROFILE}" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides "${PARAMS[@]}"

echo "info: Deploy complete."
aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --profile "${AWS_PROFILE}" \
  --query "Stacks[0].Outputs[?OutputKey=='PaperSearchApiUrl'].OutputValue | [0]" \
  --output text
