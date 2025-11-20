output "domain_name" {
  description = "OpenSearch domain name"
  value       = aws_opensearch_domain.main.domain_name
}

output "domain_arn" {
  description = "OpenSearch domain ARN"
  value       = aws_opensearch_domain.main.arn
}

output "endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.main.endpoint
  sensitive   = true
}

output "dashboard_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = aws_opensearch_domain.main.dashboard_endpoint
  sensitive   = true
}

output "kms_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.opensearch.key_id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.opensearch.id
}