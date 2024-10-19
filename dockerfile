# Node.js 베이스 이미지 선택
FROM node:16

# 애플리케이션 작업 디렉토리 설정
WORKDIR /app

# 종속성 설치
COPY package*.json ./
RUN npm install --only=production
RUN npm install express
RUN npm install puppeteer
RUN npm install puppeteer-screen-recorder@3.0.3
RUN npm install --save @google-cloud/bigquery

# 소스 코드 복사
COPY . .

# 애플리케이션 포트 노출
EXPOSE 8080

# 서버 시작
CMD ["npm", "start"]