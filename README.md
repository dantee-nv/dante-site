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
The AMC project signup panel reads `VITE_AMC_SIGNUP_WEBHOOK_URL` and posts JSON to an n8n webhook.

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
- `infra/rag-demo-api/data/nestle_hr_policy.pdf`

The Lambda loads policy content from `infra/rag-demo-api/data/nestle_hr_policy.pdf` (with text fallback), applies tighter chunking with overlap, embeds with `text-embedding-3-small`, retrieves context through hybrid vector + lexical ranking (FAISS + reciprocal rank fusion), and generates final answers with `gpt-4.1-nano` using lightweight-model guardrails (context-only, concise output, no speculation, and not-found fallback).

## Deploy RAG demo API (AWS SAM)

Prerequisites:

1. AWS SAM CLI installed.
2. AWS CLI profile `dante_nv` configured.
3. OpenAI API key available for deployment parameter input.
4. Approved policy document in `infra/rag-demo-api/data/` (replace sample file before production use).

Deploy:

```bash
cd infra/rag-demo-api
sam build
sam deploy \
  --stack-name dante-rag-demo-api \
  --region us-east-2 \
  --profile dante_nv \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides \
    OpenAIApiKey=<OPENAI_API_KEY> \
    AllowedOrigins="https://dantenavarro.com,https://www.dantenavarro.com,http://localhost:5173"
```

After deploy, use the `RagDemoApiUrl` stack output as:

- `VITE_RAG_DEMO_API_URL=<RagDemoApiUrl>`

The feedback endpoint is deployed at:

- `<RagDemoApiBaseUrl>/rag-demo/feedback`

The demo download button serves:

- `/nestle_hr_policy.pdf`

## Amplify configuration

In Amplify environment variables, set:

- `VITE_CONTACT_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/contact`
- `VITE_RAG_DEMO_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/rag-demo`
- `VITE_AMC_SIGNUP_WEBHOOK_URL=http://3.16.1.186:5678/webhook/amc-30-day-watch-signup`

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
4. CORS errors: verify site origin matches the configured `AllowedOrigins`.
5. If `sam build` fails with an npm 11 error, use Node 20/npm 10 for build, or deploy directly with `sam deploy --template-file template.yaml` after `npm install` in `infra/contact-api`.
6. If `sam build` fails for `infra/rag-demo-api` with Python runtime mismatch, install `python3.12` locally (the stack runtime is pinned to `python3.12`).
