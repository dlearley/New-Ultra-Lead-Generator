terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "multiservice-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "multiservice"
}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = local.name_prefix
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  enable_vpn_gateway  = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"

  environment   = var.environment
  project_name = var.project_name
  vpc_id        = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  public_subnets  = module.vpc.public_subnets

  container_images = {
    web   = "${var.project_name}-web:latest"
    admin = "${var.project_name}-admin:latest"
    api   = "${var.project_name}-api:latest"
  }

  tags = local.common_tags
}

# RDS Database
module "rds" {
  source = "./modules/rds"

  environment    = var.environment
  project_name   = var.project_name
  vpc_id         = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets

  tags = local.common_tags
}

# OpenSearch
module "opensearch" {
  source = "./modules/opensearch"

  environment    = var.environment
  project_name   = var.project_name
  vpc_id         = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets

  tags = local.common_tags
}

# S3 Storage
module "s3" {
  source = "./modules/s3"

  environment  = var.environment
  project_name = var.project_name

  tags = local.common_tags
}

# Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  environment  = var.environment
  project_name = var.project_name
  vpc_id       = module.vpc.vpc_id

  ecs_cluster_name = module.ecs.cluster_name
  rds_instance_id  = module.rds.instance_id
  opensearch_domain = module.opensearch.domain_name

  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = module.ecs.cluster_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "opensearch_endpoint" {
  description = "OpenSearch endpoint"
  value       = module.opensearch.endpoint
  sensitive   = true
}

output "s3_buckets" {
  description = "S3 bucket names"
  value       = module.s3.buckets
}

output "load_balancer_dns" {
  description = "Load Balancer DNS name"
  value       = module.ecs.load_balancer_dns
}