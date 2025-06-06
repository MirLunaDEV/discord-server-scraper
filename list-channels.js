const DiscordScraper = require('./scraper');

async function listAllChannels() {
  const scraper = new DiscordScraper();

  try {
    // 초기화 및 로그인
    console.log('Discord에 로그인 중...');
    await scraper.initialize();

    // 서버 정보 가져오기
    const serverInfo = await scraper.getServerInfo();
    console.log(`서버: ${serverInfo.name} (${serverInfo.id})`);

    // 서버의 모든 채널 가져오기 (직접 Discord.js API 사용)
    const guild = await scraper.client.guilds.fetch(serverInfo.id);
    const allChannels = await guild.channels.fetch();

    console.log(`\n모든 채널 ${allChannels.size}개 발견:`);

    // 채널 정보 출력
    console.log('\n채널 목록:');
    console.log('='.repeat(100));
    console.log('채널 ID'.padEnd(25) + '| 채널 이름'.padEnd(30) + '| 채널 유형'.padEnd(20) + '| 카테고리');
    console.log('-'.repeat(100));

    // 채널 유형 이름 매핑
    const channelTypeNames = {
      0: 'TEXT',
      1: 'DM',
      2: 'VOICE',
      3: 'GROUP_DM',
      4: 'CATEGORY',
      5: 'ANNOUNCEMENT',
      10: 'ANNOUNCEMENT_THREAD',
      11: 'PUBLIC_THREAD',
      12: 'PRIVATE_THREAD',
      13: 'STAGE_VOICE',
      14: 'DIRECTORY',
      15: 'FORUM',
      16: 'MEDIA'
    };

    // 모든 채널 정보 출력
    allChannels.forEach(channel => {
      const channelTypeName = channelTypeNames[channel.type] || `UNKNOWN(${channel.type})`;
      const parentName = channel.parent ? channel.parent.name : '(없음)';

      console.log(
        `${channel.id.padEnd(25)}| ${(channel.name || '(이름 없음)').padEnd(30)}| ${channelTypeName.padEnd(20)}| ${parentName}`
      );
    });

    console.log('='.repeat(100));
    console.log('\n사용 방법:');
    console.log('특정 채널만 수집하려면 다음 명령어를 사용하세요:');
    console.log('node index.js --channels 채널ID');
    console.log('\n예시:');
    if (allChannels.size > 0) {
      const firstChannel = allChannels.first();
      console.log(`node index.js --channels ${firstChannel.id}`);
    }

    console.log('\n포럼/미디어 채널 사용 방법:');
    console.log('포럼이나 미디어 채널의 경우 직접 채널 ID를 지정하여 수집할 수 있습니다.');

    // 포럼/미디어 채널 찾기
    const forumChannels = allChannels.filter(ch => ch.type === 15 || ch.type === 16);
    if (forumChannels.size > 0) {
      console.log('\n발견된 포럼/미디어 채널:');
      forumChannels.forEach(channel => {
        console.log(`- ${channel.name}: ${channel.id}`);
      });
    }
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    // 클라이언트 종료
    await scraper.close();
  }
}

listAllChannels().catch(console.error);
