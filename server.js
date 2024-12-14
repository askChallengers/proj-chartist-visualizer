const express = require('express');
const path = require('path');
const {BigQuery} = require('@google-cloud/bigquery');
const config = require('./config.js');

const app = express();
const port = `${config.port}`;

// 정적 파일 제공 (HTML, CSS, JavaScript)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const keyFile = `${config.keyFile}`;
const bigquery = new BigQuery({
  keyFilename: keyFile
});

// 클라이언트에 환경변수 전달
app.get('/bigquery-data', async (req, res) => {
  try {
      const query = 
      `
        DECLARE end_date DATE DEFAULT CURRENT_DATE('Asia/Seoul') - 1;
        DECLARE start_date DATE DEFAULT end_date - (${config.period} - 1);

        WITH latest_img AS (
          SELECT 
            artistId
            , img_url
            , reg_date
            , ROW_NUMBER() OVER (PARTITION BY artistId ORDER BY reg_date DESC) AS rn
          FROM team-ask-infra.chartist.daily_report
          WHERE 1 = 1 
            AND reg_date BETWEEN start_date AND end_date
        )

        SELECT 
          main.artistName
          , main.view_count
          , latest.img_url
          , main.reg_date
        FROM team-ask-infra.chartist.daily_report main
          JOIN latest_img latest ON main.artistId = latest.artistId AND latest.rn = 1
        WHERE 1 = 1 
          AND main.view_count IS NOT NULL
          AND main.reg_date BETWEEN start_date AND end_date
        ORDER BY main.reg_date
        ;
      `;
      const [rows] = await bigquery.query(query);
      res.json(rows);  // JSON으로 응답

      console.log('BigQuery rows:', rows);
  } catch (error) {
      console.error('BigQuery error:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/config', (req, res) => {
  const config = require('./config.js');  // config.js 파일을 가져옵니다
  res.json(config);  // JSON 형태로 클라이언트에 전달
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
