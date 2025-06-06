require('dotenv').config();

module.exports = {
  // Discord 계정 정보
  email: process.env.DISCORD_EMAIL,
  password: process.env.DISCORD_PASSWORD,

  // 직접 토큰을 알고 있는 경우
  userToken: process.env.USER_TOKEN,

  // 서버 및 출력 설정
  serverId: process.env.SERVER_ID,
  outputDir: process.env.OUTPUT_DIR || '.'  // 현재 프로그램 폴더를 기본 출력 디렉토리로 설정
};
