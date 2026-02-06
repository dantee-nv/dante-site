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

## Amplify configuration

In Amplify environment variables, set:

- `VITE_CONTACT_API_URL=https://<api-id>.execute-api.us-east-2.amazonaws.com/contact`

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
