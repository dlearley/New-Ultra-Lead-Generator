output "buckets" {
  description = "S3 bucket names"
  value = {
    assets          = aws_s3_bucket.assets.id
    uploads         = aws_s3_bucket.uploads.id
    backups         = aws_s3_bucket.backups.id
    terraform_state = aws_s3_bucket.terraform_state.id
  }
}

output "assets_bucket_arn" {
  description = "Assets bucket ARN"
  value       = aws_s3_bucket.assets.arn
}

output "uploads_bucket_arn" {
  description = "Uploads bucket ARN"
  value       = aws_s3_bucket.uploads.arn
}

output "backups_bucket_arn" {
  description = "Backups bucket ARN"
  value       = aws_s3_bucket.backups.arn
}

output "terraform_state_bucket_arn" {
  description = "Terraform state bucket ARN"
  value       = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}