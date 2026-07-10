# Ophthalmic Imaging Pipeline Terraform

Minimal AWS resources for the interview proof of concept.

Resources:

- private versioned S3 bucket for raw, validated, quarantine, lakeFS, and release objects
- DynamoDB table for lakeFS metadata
- IAM policy for the principal that runs the local Dagster/lakeFS demo

No secrets are stored here.

## Review-Only Flow

```bash
cd infra/ophthalmic-imaging-pipeline
aws sso login --profile dante_nv
terraform init
terraform plan
```

Do not run `terraform apply` until the plan has been reviewed.

## Runtime Environment

After apply, export the bucket name for the pipeline:

```bash
export AWS_PROFILE=dante_nv
export AWS_REGION=us-east-2
export OPHTHO_PIPELINE_BUCKET=$(terraform output -raw bucket_name)
```

Attach `pipeline_access_policy_arn` to the IAM principal that will run the
local pipeline/lakeFS demo.
