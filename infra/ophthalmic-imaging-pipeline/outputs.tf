output "bucket_name" {
  description = "S3 bucket used by the ophthalmic imaging pipeline."
  value       = aws_s3_bucket.pipeline.bucket
}

output "bucket_arn" {
  description = "S3 bucket ARN."
  value       = aws_s3_bucket.pipeline.arn
}

output "lakefs_dynamodb_table_name" {
  description = "DynamoDB table for lakeFS metadata."
  value       = aws_dynamodb_table.lakefs_kvstore.name
}

output "lakefs_dynamodb_table_arn" {
  description = "DynamoDB table ARN for lakeFS metadata."
  value       = aws_dynamodb_table.lakefs_kvstore.arn
}

output "pipeline_access_policy_arn" {
  description = "IAM policy ARN to attach to the principal running the pipeline/lakeFS demo."
  value       = aws_iam_policy.pipeline_access.arn
}
