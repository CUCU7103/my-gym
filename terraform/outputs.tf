# terraform/outputs.tf
output "ec2_public_ip" {
  description = "EC2 인스턴스의 Elastic IP (프론트엔드 VITE_API_BASE_URL에 사용)"
  value       = aws_eip.my_gym.public_ip
}

output "ec2_instance_id" {
  description = "EC2 인스턴스 ID"
  value       = aws_instance.my_gym.id
}

output "ssh_command" {
  description = "SSH 접속 명령어"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_eip.my_gym.public_ip}"
}

output "api_base_url" {
  description = "백엔드 API 기본 URL"
  value       = "http://${aws_eip.my_gym.public_ip}:3000"
}
