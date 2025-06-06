const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Discord에 로그인하고 사용자 토큰을 추출
 * @param {string} email Discord 계정 이메일
 * @param {string} password Discord 계정 비밀번호
 * @returns {Promise<string>} Discord 사용자 토큰
 */
async function getDiscordToken(email, password) {
  console.log('Discord 로그인 및 토큰 추출 시작...');

  // 브라우저 시작 - headless: false로 설정하여 브라우저 창이 보이게 함
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  try {
    const page = await browser.newPage();

    // 네트워크 요청 모니터링 설정
    let token = null;
    await page.setRequestInterception(true);

    page.on('request', request => {
      const headers = request.headers();
      if (headers.authorization && headers.authorization !== 'undefined') {
        token = headers.authorization;
      }
      request.continue();
    });

    // 사용자 에이전트 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Discord 로그인 페이지로 이동
    await page.goto('https://discord.com/login', { waitUntil: 'networkidle2' });
    console.log('Discord 로그인 페이지 로드됨');

    // 이메일 입력
    await page.type('input[name="email"]', email);

    // 비밀번호 입력
    await page.type('input[name="password"]', password);

    // 로그인 버튼 클릭
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);

    console.log('로그인 시도 완료');

    // 2단계 인증이 필요한 경우 대기
    if (page.url().includes('auth/mfa')) {
      console.log('2단계 인증이 필요합니다. 인증 코드를 입력하세요:');

      // 사용자로부터 2단계 인증 코드 입력 받기
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const mfaCode = await new Promise(resolve => {
        readline.question('인증 코드: ', code => {
          readline.close();
          resolve(code);
        });
      });

      // 인증 코드 입력
      await page.type('input[type="text"]', mfaCode);

      // 인증 버튼 클릭
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
      ]);

      console.log('2단계 인증 완료');
    }

    // Discord 메인 페이지로 이동
    await page.goto('https://discord.com/channels/@me', { waitUntil: 'networkidle2' });

    // 토큰을 얻기 위해 잠시 대기 (네트워크 요청이 발생할 시간 제공)
    console.log('토큰 추출 중...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 토큰이 아직 없으면 페이지 새로고침 시도
    if (!token) {
      console.log('토큰을 찾지 못했습니다. 페이지 새로고침 시도...');
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 토큰이 아직도 없으면 개발자 도구 스크립트 실행 시도
    if (!token) {
      console.log('네트워크 요청에서 토큰을 찾지 못했습니다. 다른 방법 시도...');

      // 개발자 도구 콘솔에서 토큰 추출 시도
      token = await page.evaluate(() => {
        try {
          // 웹 스토리지에서 토큰 찾기 시도
          for (const key of Object.keys(window.localStorage)) {
            if (key.includes('token')) {
              return window.localStorage[key];
            }
          }

          // 문서 쿠키에서 토큰 찾기 시도
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            if (cookie.includes('token')) {
              return cookie.split('=')[1];
            }
          }

          // 네트워크 요청 디버깅을 위한 코드 삽입
          const tokenScript = document.createElement('script');
          tokenScript.innerHTML = `
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
              const request = args[0];
              const options = args[1] || {};
              if (options.headers && options.headers.authorization) {
                console.log('Token found:', options.headers.authorization);
                document.body.setAttribute('data-token', options.headers.authorization);
              }
              return originalFetch.apply(this, args);
            };
          `;
          document.head.appendChild(tokenScript);

          return null;
        } catch (e) {
          console.error('토큰 추출 스크립트 오류:', e);
          return null;
        }
      });

      // 스크립트 삽입 후 페이지 상호작용을 통해 네트워크 요청 유도
      await page.click('body');
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 삽입된 스크립트로 설정된 data-token 속성 확인
      const dataToken = await page.evaluate(() => {
        return document.body.getAttribute('data-token');
      });

      if (dataToken) {
        token = dataToken;
      }
    }

    // 토큰을 찾지 못한 경우 사용자에게 직접 입력 요청
    if (!token) {
      console.log('자동으로 토큰을 추출할 수 없습니다. 수동으로 토큰을 입력해주세요.');
      console.log('브라우저에서 F12를 눌러 개발자 도구를 열고, 네트워크 탭에서 아무 요청이나 선택한 후');
      console.log('요청 헤더에서 "authorization" 값을 찾아 복사해주세요.');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      token = await new Promise(resolve => {
        readline.question('토큰: ', inputToken => {
          readline.close();
          resolve(inputToken.trim());
        });
      });
    }

    if (!token) {
      throw new Error('토큰을 추출할 수 없습니다. 로그인이 성공적으로 이루어졌는지 확인하세요.');
    }

    console.log('토큰 추출 성공');

    // 토큰을 파일에 저장 (보안을 위해 별도 파일에 저장)
    try {
      fs.writeFileSync('discord_token.txt', token, 'utf8');
      console.log('토큰이 discord_token.txt 파일에 저장되었습니다.');
    } catch (err) {
      console.error('토큰 저장 중 오류 발생:', err);
    }

    return token;
  } catch (error) {
    console.error('토큰 추출 중 오류 발생:', error);
    throw error;
  } finally {
    // 브라우저 종료
    await browser.close();
  }
}

module.exports = { getDiscordToken };
