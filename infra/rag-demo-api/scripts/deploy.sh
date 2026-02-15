#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-dante-rag-demo-api}"
AWS_REGION="${AWS_REGION:-us-east-2}"
AWS_PROFILE="${AWS_PROFILE:-dante_nv}"
CHAT_MODEL="${CHAT_MODEL:-gpt-4.1-nano}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-text-embedding-3-small}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Deploy the RAG demo stack with build-template guardrails.

Usage:
  OPENAI_API_KEY=sk-... ./scripts/deploy.sh [options]

Options:
  --openai-api-key <value>   OpenAI API key (prefer env var to avoid shell history)
  --allowed-origins <csv>    CORS origins. Defaults to current stack AllowedOrigins.
  --stack-name <name>        CloudFormation stack (default: dante-rag-demo-api)
  --region <region>          AWS region (default: us-east-2)
  --profile <profile>        AWS profile (default: dante_nv)
  --chat-model <model>       Chat model parameter (default: gpt-4.1-nano)
  --embedding-model <model>  Embedding model parameter (default: text-embedding-3-small)
  --help                     Show this message
EOF
}

fail() {
  echo "error: $*" >&2
  exit 1
}

info() {
  echo "info: $*"
}

validate_openai_key() {
  local key="$1"
  local key_lower

  if [[ -z "$key" ]]; then
    fail "OPENAI_API_KEY is required."
  fi

  if [[ "${#key}" -lt 20 ]]; then
    fail "OPENAI_API_KEY looks too short (${#key} chars)."
  fi

  if [[ "$key" != sk-* ]]; then
    fail "OPENAI_API_KEY must start with 'sk-'."
  fi

  if [[ "$key" =~ [[:space:]] ]]; then
    fail "OPENAI_API_KEY must not include whitespace."
  fi

  key_lower="$(printf "%s" "$key" | tr '[:upper:]' '[:lower:]')"
  case "$key_lower" in
    "<openai_api_key>"|"<your_openai_api_key>"|openai_api_key|your_openai_api_key|changeme|replace_me|replace-me|placeholder|dummy)
      fail "OPENAI_API_KEY appears to be a placeholder value."
      ;;
  esac
}

resolve_allowed_origins() {
  local existing_origins

  if [[ -n "$ALLOWED_ORIGINS" ]]; then
    return
  fi

  existing_origins="$(
    aws cloudformation describe-stacks \
      --stack-name "$STACK_NAME" \
      --region "$AWS_REGION" \
      --profile "$AWS_PROFILE" \
      --query "Stacks[0].Parameters[?ParameterKey=='AllowedOrigins'].ParameterValue | [0]" \
      --output text 2>/dev/null || true
  )"

  if [[ -n "$existing_origins" && "$existing_origins" != "None" ]]; then
    ALLOWED_ORIGINS="$existing_origins"
    info "Using existing AllowedOrigins from stack parameters."
    return
  fi

  fail "ALLOWED_ORIGINS is required when stack has no existing AllowedOrigins parameter."
}

check_packaging_safety() {
  local aws_sam_size_mb=0

  if [[ -d ".aws-sam" ]]; then
    aws_sam_size_mb="$(du -sm .aws-sam | awk '{print $1}')"
  fi

  if [[ "$aws_sam_size_mb" =~ ^[0-9]+$ ]] && (( aws_sam_size_mb > 200 )); then
    info ".aws-sam is ${aws_sam_size_mb}MB. Deploying only from .aws-sam/build/template.yaml."
  fi
}

assert_built_template_safe() {
  local built_template="$1"

  [[ -f "$built_template" ]] || fail "Built template not found at $built_template"

  if command -v rg >/dev/null 2>&1; then
    if rg -q "CodeUri:\\s*\\.$" "$built_template"; then
      fail "Built template still contains CodeUri: . ; refusing deploy."
    fi
  else
    if grep -Eq "CodeUri:[[:space:]]*\\.$" "$built_template"; then
      fail "Built template still contains CodeUri: . ; refusing deploy."
    fi
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --openai-api-key)
      OPENAI_API_KEY="${2:-}"
      shift 2
      ;;
    --allowed-origins)
      ALLOWED_ORIGINS="${2:-}"
      shift 2
      ;;
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
    --chat-model)
      CHAT_MODEL="${2:-}"
      shift 2
      ;;
    --embedding-model)
      EMBEDDING_MODEL="${2:-}"
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

validate_openai_key "$OPENAI_API_KEY"
resolve_allowed_origins
check_packaging_safety

info "Running sam build..."
sam build --template-file template.yaml

BUILT_TEMPLATE=".aws-sam/build/template.yaml"
assert_built_template_safe "$BUILT_TEMPLATE"

info "Deploying stack ${STACK_NAME} in ${AWS_REGION} with profile ${AWS_PROFILE}..."
sam deploy \
  --template-file "$BUILT_TEMPLATE" \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides \
    "OpenAIApiKey=${OPENAI_API_KEY}" \
    "AllowedOrigins=${ALLOWED_ORIGINS}" \
    "ChatModel=${CHAT_MODEL}" \
    "EmbeddingModel=${EMBEDDING_MODEL}"

RAG_FUNCTION_NAME="$(
  aws cloudformation list-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query "StackResourceSummaries[?LogicalResourceId=='RagDemoFunction'].PhysicalResourceId | [0]" \
    --output text
)"

[[ -n "$RAG_FUNCTION_NAME" && "$RAG_FUNCTION_NAME" != "None" ]] || fail "Could not resolve RagDemoFunction physical name."

KEY_LENGTH="$(
  aws lambda get-function-configuration \
    --function-name "$RAG_FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query "length(Environment.Variables.OPENAI_API_KEY)" \
    --output text
)"
KEY_PREFIX_OK="$(
  aws lambda get-function-configuration \
    --function-name "$RAG_FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query "starts_with(Environment.Variables.OPENAI_API_KEY, 'sk-')" \
    --output text
)"

if [[ "$KEY_PREFIX_OK" != "True" || "$KEY_LENGTH" -lt 20 ]]; then
  fail "Post-deploy key validation failed (length=${KEY_LENGTH}, starts_with_sk=${KEY_PREFIX_OK})."
fi

RAG_API_URL="$(
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query "Stacks[0].Outputs[?OutputKey=='RagDemoApiUrl'].OutputValue | [0]" \
    --output text
)"

info "Deploy complete."
info "RagDemoApiUrl: ${RAG_API_URL}"
