variable "aws_profile" {
  description = "AWS CLI profile used for Terraform operations."
  type        = string
  default     = "dante_nv"
}

variable "aws_region" {
  description = "AWS region for the pipeline resources."
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Name prefix for resources."
  type        = string
  default     = "ophthalmic-imaging-pipeline"
}

variable "environment" {
  description = "Environment label."
  type        = string
  default     = "demo"
}

variable "bucket_name" {
  description = "Optional explicit S3 bucket name. Leave empty to derive a name from account and region."
  type        = string
  default     = ""
}

variable "lakefs_principal_arn" {
  description = "Optional IAM principal ARN allowed to read/write the lakeFS bucket prefix."
  type        = string
  default     = ""
}
