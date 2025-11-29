# Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-subnet-group"
  subnet_ids = var.private_subnets

  tags = var.tags
}

# Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${local.name_prefix}-rds-"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow PostgreSQL traffic from VPC CIDR"
    from_port   = 5432
    to_port     = 5432
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

# Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${local.name_prefix}-pg"

  parameters {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameters {
    name  = "max_connections"
    value = "200"
  }

  tags = var.tags
}

# Option Group
resource "aws_db_option_group" "main" {
  name                 = "${local.name_prefix}-og"
  engine_name          = "postgres"
  major_engine_version = "15"

  tags = var.tags
}

# Random password
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "${var.project_name}_${var.environment}"
  username = "${var.project_name}_user"
  password = random_password.db_password.result

  port = 5432

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  parameter_group_name = aws_db_parameter_group.main.name
  option_group_name    = aws_db_option_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"
  delete_automated_backups  = false

  deletion_protection = false

  tags = var.tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "rds" {
  name              = "/aws/rds/instance/${aws_db_instance.main.identifier}"
  retention_in_days = 30

  tags = var.tags
}

# Store credentials in SSM Parameter Store
resource "aws_ssm_parameter" "db_host" {
  name  = "/${var.project_name}/${var.environment}/db/host"
  type  = "String"
  value = aws_db_instance.main.address

  tags = var.tags
}

resource "aws_ssm_parameter" "db_port" {
  name  = "/${var.project_name}/${var.environment}/db/port"
  type  = "String"
  value = tostring(aws_db_instance.main.port)

  tags = var.tags
}

resource "aws_ssm_parameter" "db_username" {
  name  = "/${var.project_name}/${var.environment}/db/username"
  type  = "SecureString"
  value = aws_db_instance.main.username

  tags = var.tags
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project_name}/${var.environment}/db/password"
  type  = "SecureString"
  value = random_password.db_password.result

  tags = var.tags
}

resource "aws_ssm_parameter" "db_name" {
  name  = "/${var.project_name}/${var.environment}/db/name"
  type  = "String"
  value = aws_db_instance.main.db_name

  tags = var.tags
}

# ECS tasks security group will be passed in as a variable or created separately
# For now, we'll create a basic security group that allows traffic from within VPC