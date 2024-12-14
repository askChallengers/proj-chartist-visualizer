require('dotenv').config();     // env 설정 파일 임포트

// 공통으로 사용되는 변수
const commonConfig = {
    port: 8080,
    result_cnt: 8,          // 결과 막대 수
    period: 7,              // 기간
    video_time: 20000       // 동영상 길이(ms)
};
// duration은 commonConfig 객체를 초기화한 후 계산
commonConfig.duration = Math.floor((commonConfig.video_time / commonConfig.period) * 10) / 10;      // 하루 데이터가 지나가는 시간(소수점 둘째 자리에서 내림.)

// 환경별로 다르게 설정해야 하는 변수
const devConfig = {
    keyFile: './service-account-file.json'

};

const prodConfig = {
    keyFile: '/secrets/team-ask-visualizer-google-cloud-access-info-json'
};

// 환경 변수로 프로파일 결정 (default: 'prod')
const profile = process.env.PROFILE  || 'prod';
console.log("Current Profile : " + process.env.PROFILE);

// 환경별 설정 적용
const environmentConfig = profile === 'dev' ? devConfig : prodConfig;

// 공통 변수와 환경별 변수를 합치기
const config = {
    ...commonConfig,
    ...environmentConfig,
};

module.exports = config;