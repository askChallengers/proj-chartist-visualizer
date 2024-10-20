# Dockerfile

# Node.js 이미지를 기반으로 설정
FROM node:16

# 작업 디렉토리를 설정 (프로젝트 루트)
WORKDIR \

# package.json과 package-lock.json을 복사
COPY package*.json ./

# 프로덕션 환경에서 필요한 모듈만 설치
RUN npm install --only=production
RUN npm install @google-cloud/bigquery@7.9.1
RUN npm install @google-cloud/storage@7.13.0
RUN npm install dotenv@16.4.5
RUN npm install express@4.21.1
RUN npm install puppeteer-screen-recorder@3.0.3
RUN npm install puppeteer@23.6.0

# 나머지 애플리케이션 파일 복사
COPY . .

# 앱 실행
CMD ["npm", "start"]