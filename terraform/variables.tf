# terraform/variables.tf
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "key_pair_name" {
  description = "EC2 SSH 접속에 사용할 키 페어 이름 (AWS 콘솔에서 미리 생성)"
  type        = string
}

variable "repo_url" {
  description = "Git 레포지토리 URL (EC2 user_data에서 git clone 시 사용)"
  type        = string
}

variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.micro"
}
