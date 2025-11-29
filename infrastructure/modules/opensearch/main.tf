# Security Group for OpenSearch
resource "aws_security_group" "opensearch" {
  name_prefix = "${local.name_prefix}-opensearch-"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow OpenSearch traffic from VPC CIDR"
    from_port   = 9200
    to_port     = 9200
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  ingress {
    description = "Allow OpenSearch Dashboards traffic from VPC CIDR"
    from_port   = 5601
    to_port     = 5601
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

# IAM Service Role for OpenSearch
resource "aws_iam_service_linked_role" "opensearch" {
  aws_service_name = "opensearchservice.amazonaws.com"
}

# OpenSearch Domain
resource "aws_opensearch_domain" "main" {
  domain_name = "${local.name_prefix}-search"

  engine_version = "OpenSearch_2.8"

  cluster_config {
    instance_type          = "t3.small.search"
    instance_count         = 2
    dedicated_master_enabled = false
    zone_awareness_enabled   = true
  }

  vpc_options {
    subnet_ids         = var.private_subnets
    security_group_ids = [aws_security_group.opensearch.id]
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 100
    volume_type = "gp3"
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.opensearch.arn
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "${var.project_name}_admin"
      master_user_password = random_password.opensearch_password.result
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "AUDIT_LOGS"
  }

  tags = var.tags
}

# KMS Key for OpenSearch encryption
resource "aws_kms_key" "opensearch" {
  description             = "OpenSearch domain encryption key"
  deletion_window_in_days = 7

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow OpenSearch Service"
        Effect = "Allow"
        Principal = {
          Service = "opensearchservice.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "opensearch" {
  name          = "alias/${local.name_prefix}-opensearch"
  target_key_id = aws_kms_key.opensearch.key_id
}

# Random password for OpenSearch
resource "random_password" "opensearch_password" {
  length  = 32
  special = true
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "opensearch" {
  name              = "/aws/opensearch/${aws_opensearch_domain.main.domain_name}"
  retention_in_days = 30

  tags = var.tags
}

# Store OpenSearch URL in SSM Parameter Store
resource "aws_ssm_parameter" "opensearch_url" {
  name  = "/${var.project_name}/${var.environment}/opensearch/url"
  type  = "SecureString"
  value = "https://${aws_opensearch_domain.main.endpoint}"

  tags = var.tags
}

resource "aws_ssm_parameter" "opensearch_username" {
  name  = "/${var.project_name}/${var.environment}/opensearch/username"
  type  = "SecureString"
  value = "${var.project_name}_admin"

  tags = var.tags
}

resource "aws_ssm_parameter" "opensearch_password" {
  name  = "/${var.project_name}/${var.environment}/opensearch/password"
  type  = "SecureString"
  value = random_password.opensearch_password.result

  tags = var.tags
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# ECS tasks security group will be passed in as a variable or created separately
# For now, we'll create a basic security group that allows traffic from within VPC