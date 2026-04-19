# GitHub Actions 자동 배포 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `main` 브랜치에 push하면 GitHub Actions가 EC2에 SSH 접속해 백엔드를 재배포하고, 프론트엔드 정적 파일을 빌드해 EC2 Nginx로 서빙하도록 CI/CD 파이프라인을 구성한다.

**Architecture:**
- GitHub Actions 워크플로우 2개: `deploy-backend.yml` (Docker Compose 재시작), `deploy-frontend.yml` (Vite 빌드 → EC2 Nginx 복사)
- EC2에 Nginx를 추가 설치해 프론트엔드 정적 파일(포트 80)과 백엔드 API(포트 3000)를 같은 서버에서 제공
- 배포에 필요한 민감 정보(SSH 키, JWT 시크릿 등)는 GitHub Secrets에 저장

**Tech Stack:** GitHub Actions, SSH (appleboy/ssh-action), rsync, Nginx, Docker Compose, Vite

**사전 조건 (수동, 1회):**
1. AWS EC2가 `terraform apply`로 생성된 상태
2. GitHub 레포가 존재하고 코드가 push된 상태
3. GitHub Secrets에 아래 값들이 등록된 상태 (Task 1에서 목록 제공)

---

## 파일 구조

```
.github/
└── workflows/
    ├── deploy-backend.yml   ← 백엔드: SSH 접속 → git pull → docker compose up --build
    └── deploy-frontend.yml  ← 프론트엔드: Vite 빌드 → rsync → Nginx reload
terraform/
└── main.tf                  ← 수정: user_data에 Nginx 설치 추가
```

---

## Task 1: GitHub Secrets 목록 정의 및 Terraform user_data 수정

**Files:**
- Modify: `terraform/main.tf`

EC2 `user_data`에 Nginx 설치 및 프론트엔드 서빙 디렉토리 초기화를 추가한다.
기존에 이미 `terraform apply`를 실행한 경우 EC2에 직접 SSH로 Nginx를 설치하면 된다.

- [ ] **Step 1: GitHub Secrets 등록 목록 확인**

GitHub 레포 → Settings → Secrets and variables → Actions → "New repository secret" 에서 아래를 등록한다:

| Secret 이름 | 값 설명 |
|---|---|
| `EC2_HOST` | EC2 Elastic IP (예: `13.125.x.x`) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | `~/.ssh/my-gym-key.pem` 파일 전체 내용 (-----BEGIN RSA PRIVATE KEY----- 포함) |
| `JWT_SECRET` | 32자 이상 랜덤 문자열 |
| `JWT_REFRESH_SECRET` | 32자 이상 다른 랜덤 문자열 |
| `VITE_API_BASE_URL` | `http://<EC2_IP>:3000` |

- [ ] **Step 2: `terraform/main.tf` user_data 수정 — Nginx 추가**

```hcl
  user_data = <<-EOF
    #!/bin/bash
    set -e
    apt-get update
    apt-get install -y docker.io docker-compose-v2 git nginx

    systemctl enable docker
    systemctl start docker
    systemctl enable nginx
    systemctl start nginx

    # 프론트엔드 정적 파일 서빙 디렉토리
    mkdir -p /var/www/my-gym
    chown -R ubuntu:ubuntu /var/www/my-gym

    # Nginx 설정: 포트 80 → /var/www/my-gym 서빙
    cat > /etc/nginx/sites-available/my-gym << 'NGINX'
    server {
        listen 80;
        server_name _;
        root /var/www/my-gym;
        index index.html;

        # SPA 라우팅: 모든 경로를 index.html로
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
```

- [ ] **Step 3: 이미 EC2가 생성된 경우 SSH로 직접 Nginx 설치**

EC2가 이미 실행 중이면 user_data 변경은 재생성 시에만 적용된다.
아래 명령을 SSH로 직접 실행한다:

```bash
ssh -i ~/.ssh/my-gym-key.pem ubuntu@<EC2_IP> << 'ENDSSH'
sudo apt-get update
sudo apt-get install -y nginx
sudo mkdir -p /var/www/my-gym
sudo chown -R ubuntu:ubuntu /var/www/my-gym

sudo tee /etc/nginx/sites-available/my-gym << 'NGINX'
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

sudo ln -sf /etc/nginx/sites-available/my-gym /etc/nginx/sites-enabled/my-gym
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
echo "Nginx 설치 완료"
ENDSSH
```

- [ ] **Step 4: EC2에 앱 디렉토리 초기화 (최초 1회)**

```bash
ssh -i ~/.ssh/my-gym-key.pem ubuntu@<EC2_IP> << 'ENDSSH'
# 이미 /app이 있으면 skip
if [ ! -d /app ]; then
  sudo git clone <REPO_URL> /app
  sudo chown -R ubuntu:ubuntu /app
fi

# .env 파일 생성
cat > /app/.env << 'ENV'
JWT_SECRET=<JWT_SECRET_값>
JWT_REFRESH_SECRET=<JWT_REFRESH_SECRET_값>
FRONTEND_ORIGIN=http://<EC2_IP>
ENV

cd /app && docker compose up --build -d
echo "백엔드 초기 배포 완료"
ENDSSH
```

---

## Task 2: 백엔드 자동 배포 워크플로우

**Files:**
- Create: `.github/workflows/deploy-backend.yml`

`main` push 시 EC2에 SSH 접속해 `git pull` 후 `docker compose up --build -d` 실행.

- [ ] **Step 1: `.github/workflows/deploy-backend.yml` 작성**

```yaml
# .github/workflows/deploy-backend.yml
# main 브랜치 push 시 EC2 백엔드 자동 재배포
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'docker-compose.yml'
      - '.github/workflows/deploy-backend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: EC2에 SSH 접속해 백엔드 재배포
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            set -e
            cd /app

            # 최신 코드 pull
            git pull origin main

            # .env에 최신 시크릿 반영 (GitHub Secrets → EC2)
            cat > /app/.env << EOF
            JWT_SECRET=${{ secrets.JWT_SECRET }}
            JWT_REFRESH_SECRET=${{ secrets.JWT_REFRESH_SECRET }}
            FRONTEND_ORIGIN=http://${{ secrets.EC2_HOST }}
            EOF

            # 재빌드 및 재시작 (다운타임 최소화)
            docker compose pull db || true
            docker compose up --build -d

            # 헬스체크: 최대 30초 대기
            for i in $(seq 1 6); do
              if curl -sf http://localhost:3000/health; then
                echo "백엔드 정상 기동 확인"
                exit 0
              fi
              sleep 5
            done
            echo "헬스체크 실패" && exit 1
```

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add .github/workflows/deploy-backend.yml
git commit -m "ci: 백엔드 자동 배포 워크플로우 추가"
```

---

## Task 3: 프론트엔드 자동 배포 워크플로우

**Files:**
- Create: `.github/workflows/deploy-frontend.yml`

`main` push 시 GitHub Actions 환경에서 Vite 빌드 후 rsync로 EC2 `/var/www/my-gym`에 복사, Nginx reload.

- [ ] **Step 1: `.github/workflows/deploy-frontend.yml` 작성**

```yaml
# .github/workflows/deploy-frontend.yml
# main 브랜치 push 시 프론트엔드 빌드 후 EC2 Nginx에 배포
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4

      - name: Node.js 설치
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: 의존성 설치
        run: npm ci --legacy-peer-deps
        working-directory: frontend

      - name: 프론트엔드 빌드
        run: npm run build
        working-directory: frontend
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

      - name: EC2에 정적 파일 배포 (rsync)
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          source: 'frontend/dist/*'
          target: '/var/www/my-gym'
          strip_components: 2

      - name: Nginx reload
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: sudo systemctl reload nginx
```

- [ ] **Step 2: 커밋**

```bash
cd /Users/joongyu/toy-project/my-gym
git add .github/workflows/deploy-frontend.yml
git commit -m "ci: 프론트엔드 자동 배포 워크플로우 추가"
```

---

## Task 4: terraform apply + 최초 배포 실행

이 태스크는 **수동 실행**이 필요하다 (AWS 자격증명 + 키 페어 필요).

- [ ] **Step 1: terraform apply**

```bash
cd /Users/joongyu/toy-project/my-gym/terraform
terraform init
terraform apply \
  -var="key_pair_name=<키페어이름>" \
  -var="repo_url=https://github.com/<owner>/my-gym"
```

출력된 `ec2_public_ip` 값을 메모한다.

- [ ] **Step 2: GitHub Secrets에 EC2_HOST 등록**

terraform output에서 나온 IP를 GitHub → Settings → Secrets → `EC2_HOST`에 입력한다.

- [ ] **Step 3: EC2 초기 설정 실행 (Task 1 Step 3~4)**

Task 1의 Step 3 (Nginx 설치)와 Step 4 (앱 초기화)를 순서대로 실행한다.

- [ ] **Step 4: push로 자동 배포 트리거**

```bash
cd /Users/joongyu/toy-project/my-gym
git push origin main
```

GitHub → Actions 탭에서 워크플로우 실행 확인.

- [ ] **Step 5: 배포 검증**

```bash
# 백엔드 헬스체크
curl http://<EC2_IP>:3000/health
# 예상: {"ok":true}

# 프론트엔드 확인
curl -I http://<EC2_IP>
# 예상: HTTP/1.1 200 OK
```

브라우저에서 `http://<EC2_IP>` 접속 → 로그인 화면 표시 확인.

---

## 전체 배포 흐름 요약

```
git push origin main
    ↓
GitHub Actions (deploy-backend.yml)     GitHub Actions (deploy-frontend.yml)
    ↓                                       ↓
EC2 SSH 접속                            Vite 빌드 (VITE_API_BASE_URL 주입)
git pull + docker compose up -d             ↓
헬스체크 통과                           EC2 rsync → /var/www/my-gym
                                        Nginx reload
                                            ↓
                                    http://<EC2_IP> 서빙
```
