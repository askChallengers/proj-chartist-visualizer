const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// 정적 파일 제공 (HTML, CSS, JavaScript)
app.use(express.static(path.join(__dirname, 'public')));

// 클라이언트에 환경변수 전달
app.get('/env', (req, res) => {
  res.json({
    GOOGLE_SHEET_TOP8_GROUP_URI: process.env.GOOGLE_SHEET_TOP8_GROUP_URI
  });
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
