const DiscordScraper = require('./scraper');

/**
 * 명령줄 인자 파싱
 * @returns {Object} 파싱된 인자 객체
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const result = {
    mode: 'all', // 기본 모드: 모든 채널 수집
    channelIds: [],
    messageLimit: 1000
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--channels' || arg === '-c') {
      // 다음 인자가 있고 '--'로 시작하지 않으면 채널 ID로 간주
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        // 쉼표로 구분된 채널 ID 목록
        result.channelIds = args[++i].split(',');
        result.mode = 'specific';
      }
    } else if (arg === '--limit' || arg === '-l') {
      // 다음 인자가 있고 숫자이면 메시지 제한으로 간주
      if (i + 1 < args.length && !isNaN(args[i + 1])) {
        result.messageLimit = parseInt(args[++i], 10);
      }
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return result;
}

/**
 * 도움말 표시
 */
function showHelp() {
  console.log(`
Discord 서버 데이터 수집기 사용법:

기본 사용법:
  node index.js [옵션]

옵션:
  --channels, -c <채널ID1,채널ID2,...>  특정 채널만 수집 (쉼표로 구분)
  --limit, -l <숫자>                    채널당 수집할 최대 메시지 수 (기본값: 모든 메시지)
  --help, -h                           도움말 표시

예시:
  모든 채널 수집:
    node index.js
  
  특정 채널만 수집:
    node index.js --channels 123456789012345678,876543210987654321
  
  메시지 수 제한:
    node index.js --limit 500
    
  특정 채널에서 메시지 수 제한:
    node index.js --channels 123456789012345678 --limit 500
  `);
}

async function main() {
  // 명령줄 인자 파싱
  const args = parseArguments();
  
  const scraper = new DiscordScraper();
  
  try {
    // 초기화 및 로그인
    console.log('Discord에 로그인 중...');
    await scraper.initialize();
    
    if (args.mode === 'specific') {
      // 특정 채널만 수집
      console.log(`특정 채널 수집 모드: ${args.channelIds.length}개 채널, 채널당 최대 ${args.messageLimit}개 메시지`);
      await scraper.scrapeSpecificChannels(args.channelIds, args.messageLimit);
    } else {
      // 모든 채널 수집
      console.log(`전체 서버 수집 모드: 채널당 최대 ${args.messageLimit}개 메시지`);
      await scraper.scrapeServer(args.messageLimit);
    }
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    // 클라이언트 종료
    await scraper.close();
  }
}

// 인자가 --help 또는 -h인 경우 도움말 표시
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
} else {
  main().catch(console.error);
}
