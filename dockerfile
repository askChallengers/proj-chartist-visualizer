# Node.js 베이스 이미지 선택
FROM node:16

# 애플리케이션 작업 디렉토리 설정
WORKDIR /app

# 종속성 설치
COPY package*.json ./
RUN npm install --only=production
RUN npm install @google-cloud/bigquery@7.9.1
RUN npm install @google-cloud/storage@7.13.0
RUN npm install dotenv@16.4.5
RUN npm install express@4.21.1
RUN npm install puppeteer-screen-recorder@3.0.3
RUN npm install puppeteer@23.6.0

# 소스 코드 복사
COPY . .

# 애플리케이션 포트 노출
EXPOSE 8080

# 서버 시작
CMD ["npm", "start"]