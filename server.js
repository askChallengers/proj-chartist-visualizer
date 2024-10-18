const express = require('express');
const path = require('path');
require('dotenv').config();
const {BigQuery} = require('@google-cloud/bigquery');

const app = express();
const port = 3000;

// 정적 파일 제공 (HTML, CSS, JavaScript)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const keyFile = path.join(__dirname, 'service-account-file.json');
const bigquery = new BigQuery({
  keyFilename: keyFile
});

// 클라이언트에 환경변수 전달
app.get('/env', (req, res) => {
  res.json({
    GOOGLE_SHEET_TOP8_GROUP_URI: process.env.GOOGLE_SHEET_TOP8_GROUP_URI
  });
});

app.get('/bigquery-data', async (req, res) => {
  try {
      const query = 
      `
      SELECT artistName, mv_views, img_url, reg_date
      FROM team-ask-infra.chartist.daily_report
      WHERE mv_views IS NOT NULL
      ORDER BY reg_date
      LIMIT 100;
      `;
      const [rows] = await bigquery.query(query);
      res.json(rows);  // JSON으로 응답
  } catch (error) {
      console.error('BigQuery error:', error);
      res.status(500).send('Internal Server Error');
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
