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
  description = "my-gym EC2 security group"

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

  # EC2 최초 실행 시 Docker + Docker Compose + Nginx 설치
  # .env 파일은 GitHub Actions 배포 워크플로우가 자동으로 생성
  user_data = <<-EOF
    #!/bin/bash
    set -e
    apt-get update
    apt-get install -y docker.io docker-compose-v2 git nginx

    systemctl enable docker
    systemctl start docker
    # ubuntu 사용자가 sudo 없이 docker 명령 실행 가능하도록 그룹 추가
    usermod -aG docker ubuntu
    systemctl enable nginx
    systemctl start nginx

    # 프론트엔드 정적 파일 서빙 디렉토리
    mkdir -p /var/www/my-gym
    chown -R ubuntu:ubuntu /var/www/my-gym

    # Nginx 설정: 포트 80 → /var/www/my-gym 서빙, SPA 라우팅 지원
    cat > /etc/nginx/sites-available/my-gym << 'NGINX'
server {
    listen 80;
    server_name _;
    root /var/www/my-gym;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

    ln -sf /etc/nginx/sites-available/my-gym /etc/nginx/sites-enabled/my-gym
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx

    git clone ${var.repo_url} /app
    cd /app
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
