# n8n AMC Signup Workflow

This folder contains a ready-to-import workflow for the AMC 30-Day Watch form.

## Files

- `amc-30-day-watch-signup.workflow.json`

## What it does

1. Receives POST requests on a webhook path.
2. Validates and normalizes the submitted email.
3. Upserts into workflow static JSON (`getWorkflowStaticData("global")`) at:
   - `amcThirtyDayWatchSubscribers`
4. Returns JSON response for the frontend.

## Import steps

1. In n8n, go to `Workflows -> Import from file`.
2. Select `amc-30-day-watch-signup.workflow.json`.
3. Open `AMC Signup Webhook` node and copy the Production URL.
4. Set frontend env var:
   - `VITE_AMC_SIGNUP_WEBHOOK_URL=http://3.16.1.186:5678/webhook/amc-30-day-watch-signup`
5. Activate the workflow.

## Test request (API format)

```bash
curl -X POST "http://3.16.1.186:5678/webhook/amc-30-day-watch-signup" \
  -H "content-type: application/json" \
  -d '{
    "email": "user@example.com",
    "watchMode": "30_day_watch"
  }'
```

Expected success response:

```json
{
  "ok": true,
  "message": "Added to 30-Day Watch.",
  "subscriberCount": 1
}
```
