data "aws_caller_identity" "current" {}

locals {
  normalized_project_name = replace(var.project_name, "_", "-")
  bucket_name = var.bucket_name != "" ? var.bucket_name : format(
    "%s-%s-%s",
    local.normalized_project_name,
    data.aws_caller_identity.current.account_id,
    var.aws_region
  )

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "interview-poc"
  }
}

resource "aws_s3_bucket" "pipeline" {
  bucket = local.bucket_name

  tags = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "pipeline" {
  bucket = aws_s3_bucket.pipeline.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "pipeline" {
  bucket = aws_s3_bucket.pipeline.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pipeline" {
  bucket = aws_s3_bucket.pipeline.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "lakefs_kvstore" {
  name         = "${var.project_name}-lakefs-kvstore"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PartitionKey"
  range_key    = "ItemKey"

  attribute {
    name = "PartitionKey"
    type = "B"
  }

  attribute {
    name = "ItemKey"
    type = "B"
  }

  tags = local.common_tags
}

data "aws_iam_policy_document" "pipeline_access" {
  statement {
    sid = "PipelineBucketList"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [aws_s3_bucket.pipeline.arn]
  }

  statement {
    sid = "PipelineObjectAccess"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts",
    ]
    resources = ["${aws_s3_bucket.pipeline.arn}/*"]
  }

  statement {
    sid = "LakeFSDynamoDBAccess"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:CreateTable",
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [aws_dynamodb_table.lakefs_kvstore.arn]
  }
}

resource "aws_iam_policy" "pipeline_access" {
  name        = "${var.project_name}-access"
  description = "Least-privilege access for the ophthalmic imaging pipeline demo."
  policy      = data.aws_iam_policy_document.pipeline_access.json

  tags = local.common_tags
}

data "aws_iam_policy_document" "optional_lakefs_bucket_policy" {
  count = var.lakefs_principal_arn == "" ? 0 : 1

  statement {
    sid = "LakeFSObjectAccess"
    principals {
      type        = "AWS"
      identifiers = [var.lakefs_principal_arn]
    }
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts",
    ]
    resources = ["${aws_s3_bucket.pipeline.arn}/*"]
  }

  statement {
    sid = "LakeFSBucketAccess"
    principals {
      type        = "AWS"
      identifiers = [var.lakefs_principal_arn]
    }
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
      "s3:ListBucketMultipartUploads",
    ]
    resources = [aws_s3_bucket.pipeline.arn]
  }
}

resource "aws_s3_bucket_policy" "lakefs" {
  count  = var.lakefs_principal_arn == "" ? 0 : 1
  bucket = aws_s3_bucket.pipeline.id
  policy = data.aws_iam_policy_document.optional_lakefs_bucket_policy[0].json
}
