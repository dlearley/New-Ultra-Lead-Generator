output "instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "host" {
  description = "RDS instance host"
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "username" {
  description = "Database username"
  value       = aws_db_instance.main.username
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.rds.id
}

output "subnet_group_name" {
  description = "DB subnet group name"
  value       = aws_db_subnet_group.main.name
}