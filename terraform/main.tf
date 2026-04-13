# terraform/main.tf
terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Ubuntu 24.04 LTS AMI (ap-northeast-2 서울 리전)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 보안 그룹: SSH(22), HTTP(80), HTTPS(443), API(3000) 허용
resource "aws_security_group" "my_gym" {
  name        = "my-gym-sg"
  description = "my-gym EC2 보안 그룹"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Node.js API"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "my-gym-sg"
    Project = "my-gym"
  }
}

# EC2 인스턴스
resource "aws_instance" "my_gym" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.my_gym.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  # EC2 최초 실행 시 Docker + Docker Compose 설치
  # .env 파일은 배포 후 SSH로 수동 배치 (JWT 시크릿 포함)
  user_data = <<-EOF
    #!/bin/bash
    set -e
    apt-get update
    apt-get install -y docker.io docker-compose-v2 git

    systemctl enable docker
    systemctl start docker

    git clone ${var.repo_url} /app
    cd /app

    # 배포 후 아래 명령 실행:
    # scp .env ubuntu@<EC2_IP>:/app/.env
    # ssh ubuntu@<EC2_IP> "cd /app && docker compose up -d"
    EOF

  tags = {
    Name    = "my-gym-server"
    Project = "my-gym"
  }
}

# Elastic IP (인스턴스 재시작 후에도 IP 유지)
resource "aws_eip" "my_gym" {
  instance = aws_instance.my_gym.id
  domain   = "vpc"

  tags = {
    Name    = "my-gym-eip"
    Project = "my-gym"
  }
}
