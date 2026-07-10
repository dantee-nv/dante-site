# dante-site

Personal site built with React + Vite.

## Local frontend setup

1. Install dependencies:
```bash
npm install
```
2. Copy environment template and set your API endpoint:
```bash
cp .env.example .env
```
3. Start local dev server:
```bash
npm run dev
```

The contact page reads `VITE_CONTACT_API_URL` and posts JSON to that endpoint.
The Project 3 demo panel reads `VITE_RAG_DEMO_API_URL` and calls the Python RAG demo endpoint.
The clinical RAG demo panel reads `VITE_CLINICAL_RAG_API_URL` and calls the Python clinical RAG endpoint.
The coding challenge chatbot panel reads `VITE_CODING_CHAT_API_URL` (or derives from `VITE_RAG_DEMO_API_URL`) and calls the Python coding chat endpoint.
The context-based paper search panel reads `VITE_PAPER_SEARCH_API_URL` and calls the Python semantic rerank endpoint.
The AMC project signup panel reads `VITE_AMC_SIGNUP_WEBHOOK_URL` and `VITE_AMC_PUBLIC_SIGNUP_ENABLED`.

## Ophthalmic imaging pipeline PoC

The ophthalmic imaging project is an interview-ready dataset workflow, not a
frontend upload tool:

`Synthetic OCT/RGB sample data -> AWS S3 raw zone -> Dagster validation -> S3 validated/quarantine zones -> lakeFS branch/commit/tag -> Label Studio task export/import -> fixed-seed dataset release`

Core files:

- `backend/ophthalmic_imaging_pipeline/README.md`
- `backend/ophthalmic_imaging_pipeline/assets.py`
- `infra/ophthalmic-imaging-pipeline/README.md`
- `src/content/ophthalmic-imaging-pipeline/architecture.mmd`

Defaults:

- `AWS_PROFILE=dante_nv`
- `AWS_REGION=us-east-2`
- `OPHTHO_PIPELINE_BUCKET=<terraform output bucket_name>`

Terraform follows a review-first flow: authenticate with AWS SSO, run and review
`terraform plan`, then apply only when the changes are approved.

## Contact API architecture

The contact form pipeline is:

`React form -> API Gateway (HTTP API) -> Lambda -> SES`

Infrastructure and Lambda code live in:

- `infra/contact-api/template.yaml`
- `infra/contact-api/src/handler.mjs`

## Deploy contact API (AWS SAM)

Prerequisites:

1. AWS SAM CLI installed.
2. AWS CLI profile `dante_nv` configured.
3. SES sender identity verified in `us-east-2`.

Deploy:

```bash
cd infra/contact-api
npm install
sam build
sam deploy \
  --stack-name dante-contact-api \
  --region us-east-2 \
  --profile dante_nv \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides \
    SesFromEmail=<SES_FROM_EMAIL> \
    ContactToEmail=<CONTACT_TO_EMAIL> \
    AllowedOrigins="https://dantenavarro.com,https://www.dantenavarro.com,http://localhost:5173"
```

After deploy, use the `ContactApiUrl` stack output as:

- `VITE_CONTACT_API_URL=<ContactApiUrl>`

## AMC 30-Day Watch signup (n8n webhook)

The AMC project detail page signup pipeline is:

`React AMC signup panel -> n8n webhook -> n8n Code node (workflow static JSON upsert)`

Ready-to-import workflow files are in:

- `infra/n8n/amc-30-day-watch-signup.workflow.json`
- `infra/n8n/README.md`

Frontend config:

- `VITE_AMC_SIGNUP_WEBHOOK_URL=http://3.16.1.186:5678/webhook/amc-30-day-watch-signup`
- `VITE_AMC_PUBLIC_SIGNUP_ENABLED=false` (set `true` when public signup rollout is ready)

Frontend payload contract:

```json
{
  "email": "user@example.com",
  "watchMode": "30_day_watch"
}
```

Expected n8n response:

- Success: `200` with `{ "ok": true, "message": "Added to 30-Day Watch." }`
- Error: `4xx/5xx` with `{ "ok": false, "message": "..." }`

Example n8n Code node upsert logic:

```js
const data = getWorkflowStaticData("global");
if (!Array.isArray(data.amcThirtyDayWatchSubscribers)) {
  data.amcThirtyDayWatchSubscribers = [];
}

const input = items[0]?.json ?? {};
const email = String(input.email || "").trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return [{ json: { ok: false, message: "Invalid email." } }];
}

const now = new Date().toISOString();
const list = data.amcThirtyDayWatchSubscribers;
const existing = list.find((entry) => entry.email === email);

if (existing) {
  existing.watchMode = "30_day_watch";
  existing.updatedAt = now;
} else {
  list.push({
    email,
    watchMode: "30_day_watch",
    updatedAt: now,
  });
}

return [{ json: { ok: true, message: "Added to 30-Day Watch." } }];
```

## RAG demo API architecture

The Project 3 in-page demo pipeline is:

`React demo panel -> API Gateway (HTTP API) -> Python Lambda (RAG handler)`

Feedback pipeline:

`React demo panel feedback form -> API Gateway (HTTP API) -> Python Lambda (feedback handler) -> DynamoDB`

Infrastructure and Lambda code live in:

- `infra/rag-demo-api/template.yaml`
- `infra/rag-demo-api/src/handler.py`
- `infra/rag-demo-api/src/rag_engine.py`
- `infra/rag-demo-api/src/feedback_handler.py`
- `infra/rag-demo-api/src/coding_chat_handler.py`
- `infra/rag-demo-api/src/coding_chat_feedback_handler.py`
- `infra/rag-demo-api/data/nestle_hr_policy.pdf`

The Lambda loads policy content from `infra/rag-demo-api/data/nestle_hr_policy.pdf` (with text fallback), applies tighter chunking with overlap, embeds with `text-embedding-3-small`, retrieves context through hybrid vector + lexical ranking (FAISS + reciprocal rank fusion), and generates final answers with `gpt-4.1-nano` using lightweight-model guardrails (context-only, concise output, no speculation, and not-found fallback).

## Deploy RAG demo API (AWS SAM)

Prerequisites:

1. AWS SAM CLI installed.
2. AWS CLI profile `dante_nv` configured.
3. OpenAI API key available for deployment parameter input.
4. Approved policy document in `infra/rag-demo-api/data/` (replace sample file before production use).

Deploy (guarded workflow):

For a first-time deploy (or when you want to explicitly update CORS origins), set both `OPENAI_API_KEY` and `ALLOWED_ORIGINS`:

```bash
cd infra/rag-demo-api
export OPENAI_API_KEY=<OPENAI_API_KEY>
export ALLOWED_ORIGINS="https://dantenavarro.com,https://www.dantenavarro.com,http://localhost:5173"
./scripts/deploy.sh
```

For redeploys where CORS origins should stay the same, you can omit `ALLOWED_ORIGINS` and reuse the current stack value:

```bash
cd infra/rag-demo-api
export OPENAI_API_KEY=<OPENAI_API_KEY>
./scripts/deploy.sh
```

Optional CORS override for preview domains:

```bash
cd infra/rag-demo-api
export OPENAI_API_KEY=<OPENAI_API_KEY>
export ALLOWED_ORIGINS="https://dantenavarro.com,https://www.dantenavarro.com,https://<your-amplify-domain>,http://localhost:5173"
./scripts/deploy.sh
```

`infra/rag-demo-api/scripts/deploy.sh` adds deployment guardrails:

- Rejects placeholder or too-short OpenAI keys before deploy.
- Runs `sam build` and deploys from `.aws-sam/build/template.yaml` (not `template.yaml`) to avoid packaging build artifacts.
- Warns when local `.aws-sam/` is large.
- Verifies post-deploy Lambda key shape (`sk-` prefix + minimum length).

After deploy, use the `RagDemoApiUrl` stack output as:

- `VITE_RAG_DEMO_API_URL=<RagDemoApiUrl>`

The feedback endpoint is deployed at:

- `<RagDemoApiBaseUrl>/rag-demo/feedback`

The demo download button serves:

- `/nestle_hr_policy.pdf`

## Clinical RAG lab

The clinical RAG lab is a separate project from the HR chatbot. It uses a curated public MedQuAD subset focused on metabolic-health topics, neutral safety constraints, and inspectable retrieval behavior:

`React demo panel -> API Gateway (HTTP API) -> Python Lambda (clinical_rag handler)`

Feedback pipeline:

`React demo panel feedback form -> API Gateway (HTTP API) -> Python Lambda (clinical_rag feedback handler) -> DynamoDB`

Core files:

- `backend/clinical_rag/ingestion.py`
- `backend/clinical_rag/rag_engine.py`
- `backend/clinical_rag/safety.py`
- `backend/clinical_rag/handler.py`
- `backend/clinical_rag/feedback_handler.py`
- `backend/clinical_rag/data/medquad_weight_inclusive_subset.jsonl`
- `backend/clinical_rag/data/medquad_weight_inclusive_embeddings.jsonl`
- `backend/clinical_rag/data/medquad_weight_inclusive_titan_embeddings.jsonl`
- `backend/clinical_rag/data/medquad_weight_inclusive_eval.jsonl`
- `backend/clinical_rag/eval/eval_summary.md`
- `infra/clinical-rag-api/template.yaml`

Data preparation:

```bash
./scripts/prepare-clinical-rag-data.sh --corpus-limit 120 --eval-limit 30
```

The ingestion step writes both the curated JSONL corpus and a precomputed embedding cache.
The Lambda loads local and Titan corpus embedding caches into module memory on cold start, so
requests reuse cached chunk vectors instead of recomputing corpus embeddings per request.
The demo can toggle between local cached retrieval and Bedrock Titan semantic retrieval fused
with BM25 lexical search.

Evaluation:

```bash
./scripts/evaluate-clinical-rag.sh
```

To compare only one retrieval mode:

```bash
./scripts/evaluate-clinical-rag.sh --retrieval-mode local_hash_vector_plus_lexical_rrf_rerank
./scripts/evaluate-clinical-rag.sh --retrieval-mode bedrock_titan_semantic_plus_bm25_rrf_rerank
```

Deploy:

```bash
./scripts/deploy-clinical-rag.sh \
  --allowed-origins "https://dantenavarro.com,https://www.dantenavarro.com,http://localhost:5173"
```

After deploy, use the `ClinicalRagAskApiUrl` stack output as:

- `VITE_CLINICAL_RAG_API_URL=<ClinicalRagAskApiUrl>`

## Coding challenge chatbot API architecture

The coding challenge chatbot pipeline is:

`React coding challenge panel -> API Gateway (HTTP API) -> Python Lambda (coding chat handler)`

Feedback pipeline:

`React coding challenge feedback form -> API Gateway (HTTP API) -> Python Lambda (coding chat feedback handler) -> DynamoDB`

Core request behavior:

- Input: `challenge` (required), `message` (required), `mode` (`hints` or `full_solution`), `history` (optional array).
- Session memory: client-provided history only, validated and trimmed server-side.
- Hints mode: strategic guidance without full final code.
- Full solution mode: complete answer with complexity and concise explanation.
- Language default: Python unless the prompt clearly requests another language.

After deploy, use the `CodingChallengeChatApiUrl` stack output as:

- `VITE_CODING_CHAT_API_URL=<CodingChallengeChatApiUrl>`

The feedback endpoint is deployed at:

- `<RagDemoApiBaseUrl>/coding-chat/feedback`

## Context-based paper search API architecture

The context-based paper search demo pipeline is:

`React demo panel -> API Gateway (HTTP API) -> Python Lambda -> Semantic Scholar + Bedrock Titan embeddings -> DynamoDB cache`

Infrastructure and backend code live in:

- `infra/paper-search-api/template.yaml`
- `backend/paper_search/handler.py`
- `backend/paper_search/semanticscholar.py`
- `backend/paper_search/bedrock_embeddings.py`
- `backend/paper_search/cache.py`
- `backend/paper_search/rate_limit.py`

Core request behavior:

- Input: `context` (required, max 8000 chars), `k` (optional, clamped to 10).
- Candidate fetch: Semantic Scholar `/graph/v1/paper/search` (max 100 candidates).
- Semantic rerank: Bedrock `amazon.titan-embed-text-v2:0`.
- Cache: DynamoDB `PaperEmbeddings` keyed by `paperId` + `contentHash`.
- Rate limiting: DynamoDB-backed per-IP per-minute counter.
- Resilience: circuit breaker for repeated Semantic Scholar `429/5xx`.

## Deploy paper search API (AWS SAM)

Prerequisites:

1. AWS SAM CLI installed.
2. AWS CLI profile `dante_nv` configured.
3. Bedrock model access enabled for `amazon.titan-embed-text-v2:0` in `us-east-2`.

Deploy:

```bash
cd /Users/dante/dante-site
./scripts/deploy-paper-search.sh \
  --allowed-origins "https://dantenavarro.com,https://www.dantenavarro.com,http://localhost:5173"
```

Optional Semantic Scholar key:

```bash
cd /Users/dante/dante-site
SEMANTIC_SCHOLAR_API_KEY=<YOUR_KEY> ./scripts/deploy-paper-search.sh \
  --allowed-origins "https://dantenavarro.com,https://www.dantenavarro.com,http://localhost:5173"
```

After deploy, use the `PaperSearchApiUrl` stack output as:

- `VITE_PAPER_SEARCH_API_URL=<PaperSearchApiUrl>`

## Amplify configuration

In Amplify environment variables, set:

- `VITE_CONTACT_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/contact`
- `VITE_RAG_DEMO_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/rag-demo`
- `VITE_CLINICAL_RAG_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/clinical-rag/ask`
- `VITE_CODING_CHAT_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/coding-chat`
- `VITE_PAPER_SEARCH_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/search`
- `VITE_AMC_SIGNUP_WEBHOOK_URL=http://3.16.1.186:5678/webhook/amc-30-day-watch-signup`
- `VITE_AMC_PUBLIC_SIGNUP_ENABLED=false`

Then trigger a redeploy.

## Security and privacy notes

1. Never commit AWS access keys or secrets.
2. Keep `.env` files out of git (only `.env.example` is committed).
3. Sender and recipient emails are passed as deploy-time parameters, not frontend code.
4. SES permissions are granted to the Lambda execution role, not to browser code.
5. API CORS is restricted to:
   - `https://dantenavarro.com`
   - `https://www.dantenavarro.com`
   - `http://localhost:5173`

## Troubleshooting

1. `400 Invalid input`: frontend payload failed backend validation.
2. `429 Too many requests`: API throttling engaged; wait and retry.
3. `500 Failed to send message`: check CloudWatch logs and SES identity/sandbox status.
4. CORS/network errors on deployed site: verify the current browser origin (for example your Amplify domain) is included in `AllowedOrigins`, then redeploy the RAG API stack:
   ```bash
   cd infra/rag-demo-api
   export OPENAI_API_KEY=<OPENAI_API_KEY>
   export ALLOWED_ORIGINS="https://dantenavarro.com,https://www.dantenavarro.com,https://<your-amplify-domain>,http://localhost:5173"
   ./scripts/deploy.sh
   ```
   Then confirm Amplify has:
   - `VITE_RAG_DEMO_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/rag-demo`
   - `VITE_CODING_CHAT_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/coding-chat`
   and trigger a frontend rebuild.
5. If `sam build` fails with an npm 11 error, use Node 20/npm 10 for build, or deploy directly with `sam deploy --template-file template.yaml` after `npm install` in `infra/contact-api`.
6. If `sam build` fails for `infra/rag-demo-api` with Python runtime mismatch, install `python3.12` locally (the stack runtime is pinned to `python3.12`).
