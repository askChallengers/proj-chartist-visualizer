const puppeteer = require('puppeteer'); 
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const config = require('./config.js');

const port = `${config.port}`;
const keyFile = `${config.keyFile}`;
const storage = new Storage({ 
  keyFilename: keyFile 
});
const bucketName = 'team-ask-storage';

function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

(async () => {
  const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 520,
    height: 720,
    deviceScaleFactor: 2,
  });

  await page.evaluate(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  });

  const recorder = new PuppeteerScreenRecorder(page);

  const formattedDate = getFormattedDate();
  const fileName = `output_${formattedDate}.mp4`;
  const localVideoPath = path.join(__dirname, fileName);
  const destinationPath = `proj-chartist-visualizer/`+ fileName;

  await page.goto('http://localhost:'+port+'/sample.html', {
    waitUntil: 'networkidle2',
  });

  await recorder.start(localVideoPath);

  await wait(config.video_time);

  await recorder.stop();

  await browser.close();

  // 비디오를 구글 스토리지로 업로드
  await uploadToGCS(destinationPath);

  // 구글 스토리지에 파일 업로드하는 함수
  async function uploadToGCS(destinationPath) {
    await storage.bucket(bucketName).upload(localVideoPath, {
      destination: destinationPath, // 파일 이름 유지
    });
    console.log(`${localVideoPath}이(가) ${bucketName} 버킷(${destinationPath}) 업로드되었습니다.`);
  }

  // 업로드 후 로컬 파일 삭제
  fs.unlink(localVideoPath, (err) => {
    if (err) {
      console.error(`파일 삭제 실패: ${err}`);
    } else {
      console.log(`${localVideoPath}이(가) 성공적으로 삭제되었습니다.`);
    }
  });

  // 프로세스 종료
  process.exit(0);
})();
