output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log group names"
  value = {
    application = aws_cloudwatch_log_group.application.name
    ecs         = aws_cloudwatch_log_group.ecs.name
  }
}

output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.application.dashboard_name
}

output "alarm_names" {
  description = "CloudWatch alarm names"
  value = {
    ecs_cpu_high          = aws_cloudwatch_metric_alarm.ecs_cpu_high.alarm_name
    ecs_memory_high       = aws_cloudwatch_metric_alarm.ecs_memory_high.alarm_name
    rds_cpu_high          = aws_cloudwatch_metric_alarm.rds_cpu_high.alarm_name
    rds_storage_low       = aws_cloudwatch_metric_alarm.rds_storage_low.alarm_name
    rds_connections_high  = aws_cloudwatch_metric_alarm.rds_connections_high.alarm_name
    opensearch_cluster_red = aws_cloudwatch_metric_alarm.opensearch_cluster_red.alarm_name
    opensearch_cpu_high   = aws_cloudwatch_metric_alarm.opensearch_cpu_high.alarm_name
    alb_5xx_errors        = aws_cloudwatch_metric_alarm.alb_5xx_errors.alarm_name
  }
}