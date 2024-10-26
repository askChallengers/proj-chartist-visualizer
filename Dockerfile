# Dockerfile

# Node.js 이미지를 기반으로 설정
FROM node:16

# 작업 디렉토리를 설정 (프로젝트 루트)
WORKDIR /app

# package.json과 package-lock.json을 복사
COPY package*.json ./

# 프로덕션 환경에서 필요한 모듈만 설치
RUN npm install

# 나머지 애플리케이션 파일 복사
COPY . .

# Make the start script executable
RUN chmod +x start.sh

# Run the start script
CMD ["./start.sh"]