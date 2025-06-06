const path = require('path');
const fs = require('fs-extra');
const { Client } = require('discord.js-selfbot-v13');
const config = require('./config');
const utils = require('./utils');
const { getDiscordToken } = require('./auth');

class DiscordScraper {
  constructor() {
    this.client = new Client({
      checkUpdate: false,
    });
    this.outputDir = config.outputDir;
    this.mediaDir = path.join(this.outputDir, 'media');
    this.initialized = false;
  }

  // Initialize Discord client and login
  async initialize() {
    let token = config.userToken;

    try {
      if (fs.existsSync('discord_token.txt')) {
        const savedToken = fs.readFileSync('discord_token.txt', 'utf8').trim();
        if (savedToken) {
          console.log('Found saved token, using it...');
          token = savedToken;
        }
      }
    } catch (err) {
      console.error('Failed to read saved token:', err);
    }

    if (!token && config.email && config.password) {
      console.log('No token found, attempting login with email/password...');
      try {
        token = await getDiscordToken(config.email, config.password);
        console.log('Token acquired successfully!');
      } catch (error) {
        throw new Error(`Failed to acquire token: ${error.message}`);
      }
    } else if (!token) {
      throw new Error('No Discord token or email/password provided. Check your .env file.');
    }

    if (!config.serverId) {
      throw new Error('Server ID not provided. Check your .env file.');
    }

    await utils.ensureDir(this.outputDir);
    await utils.ensureDir(this.mediaDir);

    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}!`);
      this.initialized = true;
    });

    await this.client.login(token);

    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.initialized) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  async getServerInfo() {
    const guild = await this.client.guilds.fetch(config.serverId);
    if (!guild) {
      throw new Error(`Server ID ${config.serverId} not found`);
    }

    return {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ dynamic: true, size: 4096 }),
      memberCount: guild.memberCount,
      createdAt: guild.createdAt
    };
  }

  async getChannels() {
    const guild = await this.client.guilds.fetch(config.serverId);
    const channels = await guild.channels.fetch();

    return channels
      .filter(channel => channel.type === 'GUILD_TEXT' || channel.type === 0)
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
        parentName: channel.parent ? channel.parent.name : null
      }));
  }

  /**
   * 채널의 메시지 수집
   * @param {string} channelId 채널 ID
   * @param {number} limit 가져올 메시지 수 (기본값: 100)
   * @returns {Array} 메시지 목록
   */
  async getMessages(channelId, limit = 100) {
    const messages = [];
    let lastId;
    let fetchedMessages;

    try {
      const channel = await this.client.channels.fetch(channelId);

      const supportedTypes = [0, 'GUILD_TEXT', 5, 'GUILD_ANNOUNCEMENT', 15, 'GUILD_FORUM', 16, 'GUILD_MEDIA'];

      if (!channel || !supportedTypes.includes(channel.type)) {
        console.warn(`Channel ${channelId} is not a supported type: ${channel.type}`);
        return [];
      }

      // Handle forum/media channels with threads
      if (channel.type === 15 || channel.type === 16 || channel.type === 'GUILD_FORUM' || channel.type === 'GUILD_MEDIA') {
        console.log(`  Forum/media channel detected: ${channel.name}`);

        const threads = await channel.threads.fetchActive();
        console.log(`  Found ${threads.threads.size} active threads`);

        const archivedThreads = await channel.threads.fetchArchived();
        console.log(`  Found ${archivedThreads.threads.size} archived threads`);

        const allThreads = [...threads.threads.values(), ...archivedThreads.threads.values()];
        console.log(`  Processing ${allThreads.length} threads...`);

        let threadCount = 0;
        for (const thread of allThreads) {
          threadCount++;
          if (threadCount > limit) break;

          console.log(`    Processing thread (${threadCount}/${Math.min(allThreads.length, limit)}): ${thread.name}`);

          try {
            const threadMessages = await thread.messages.fetch({ limit: 100 });

            threadMessages.forEach(msg => {
              messages.push({
                id: msg.id,
                threadId: thread.id,
                threadName: thread.name,
                content: msg.content,
                author: {
                  id: msg.author.id,
                  username: msg.author.username,
                  discriminator: msg.author.discriminator,
                  avatar: msg.author.avatarURL({ dynamic: true })
                },
                attachments: msg.attachments.map(attachment => ({
                  id: attachment.id,
                  url: attachment.url,
                  name: attachment.name,
                  size: attachment.size,
                  contentType: attachment.contentType
                })),
                embeds: msg.embeds.map(embed => ({
                  title: embed.title,
                  description: embed.description,
                  url: embed.url,
                  color: embed.color,
                  timestamp: embed.timestamp,
                  fields: embed.fields,
                  thumbnail: embed.thumbnail ? embed.thumbnail.url : null,
                  image: embed.image ? embed.image.url : null
                })),
                createdAt: msg.createdAt
              });
            });
          } catch (threadError) {
            console.error(`    Failed to fetch thread messages: ${thread.name}`, threadError.message);
          }
        }
      } else {
        do {
          const options = { limit: 100 };
          if (lastId) options.before = lastId;
          
          fetchedMessages = await channel.messages.fetch(options);
          
          if (fetchedMessages.size === 0) break;
          
          fetchedMessages.forEach(msg => {
            messages.push({
              id: msg.id,
              content: msg.content,
              author: {
                id: msg.author.id,
                username: msg.author.username,
                discriminator: msg.author.discriminator,
                avatar: msg.author.avatarURL({ dynamic: true })
              },
              attachments: msg.attachments.map(attachment => ({
                id: attachment.id,
                url: attachment.url,
                name: attachment.name,
                size: attachment.size,
                contentType: attachment.contentType
              })),
              embeds: msg.embeds.map(embed => ({
                title: embed.title,
                description: embed.description,
                url: embed.url,
                color: embed.color,
                timestamp: embed.timestamp,
                fields: embed.fields,
                thumbnail: embed.thumbnail ? embed.thumbnail.url : null,
                image: embed.image ? embed.image.url : null
              })),
              createdAt: msg.createdAt
            });
          });
          
          lastId = fetchedMessages.last()?.id;
          
          // 메시지 수 제한 확인
          if (messages.length >= limit) {
            messages.splice(limit);
            break;
          }
        } while (fetchedMessages.size === 100);
      }
    } catch (error) {
      console.error(`채널 ${channelId} 메시지 가져오기 실패:`, error.message);
    }

    return messages;
  }

  /**
   * 메시지에서 미디어 다운로드
   * @param {Array} messages 메시지 목록
   * @param {string} channelName 채널 이름 (폴더명으로 사용)
   */
  async downloadMedia(messages, channelName) {
    const channelMediaDir = path.join(this.mediaDir, utils.sanitizeFilename(channelName));
    await utils.ensureDir(channelMediaDir);

    const downloadPromises = [];

    for (const message of messages) {
      // 첨부 파일 다운로드
      for (const attachment of message.attachments) {
        const filename = utils.getFilenameFromUrl(attachment.url);
        const outputPath = path.join(channelMediaDir, `${message.id}_${filename}`);
        downloadPromises.push(utils.downloadFile(attachment.url, outputPath));
      }

      // 임베드 이미지 다운로드
      for (const embed of message.embeds) {
        if (embed.image) {
          const filename = utils.getFilenameFromUrl(embed.image);
          const outputPath = path.join(channelMediaDir, `${message.id}_embed_${filename}`);
          downloadPromises.push(utils.downloadFile(embed.image, outputPath));
        }
        
        if (embed.thumbnail) {
          const filename = utils.getFilenameFromUrl(embed.thumbnail);
          const outputPath = path.join(channelMediaDir, `${message.id}_thumbnail_${filename}`);
          downloadPromises.push(utils.downloadFile(embed.thumbnail, outputPath));
        }
      }
    }

    // 모든 다운로드 작업 완료 대기
    await Promise.allSettled(downloadPromises);
  }

  /**
   * 서버의 모든 데이터 수집
   * @param {number} messageLimit 채널당 가져올 메시지 수 (기본값: 1000)
   */
  async scrapeServer(messageLimit = 1000) {
    try {
      console.log('서버 데이터 수집 시작...');
      
      // 서버 정보 가져오기
      const serverInfo = await this.getServerInfo();
      console.log(`서버: ${serverInfo.name} (${serverInfo.id})`);
      
      // 서버 정보 저장
      await utils.saveJsonFile(serverInfo, path.join(this.outputDir, 'server_info.json'));
      
      // 서버 아이콘 다운로드
      if (serverInfo.icon) {
        await utils.downloadFile(serverInfo.icon, path.join(this.outputDir, 'server_icon.png'));
      }
      
      // 채널 목록 가져오기
      const channels = await this.getChannels();
      console.log(`텍스트 채널 ${channels.length}개 발견`);
      
      // 채널 정보 저장
      await utils.saveJsonFile(channels, path.join(this.outputDir, 'channels.json'));
      
      // 각 채널의 메시지 수집
      for (const channel of channels) {
        console.log(`채널 처리 중: ${channel.name} (${channel.id})`);
        
        // 채널 디렉토리 생성
        const channelDir = path.join(this.outputDir, utils.sanitizeFilename(channel.name));
        await utils.ensureDir(channelDir);
        
        // 메시지 가져오기
        const messages = await this.getMessages(channel.id, messageLimit);
        console.log(`  ${messages.length}개 메시지 수집됨`);
        
        // 메시지 저장
        await utils.saveJsonFile(messages, path.join(channelDir, 'messages.json'));
        
        // 메시지 텍스트 저장 (읽기 쉬운 형식)
        const textContent = messages.map(msg => 
          `[${new Date(msg.createdAt).toLocaleString()}] ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`
        ).join('\n');
        await utils.saveTextFile(textContent, path.join(channelDir, 'messages.txt'));
        
        // 미디어 다운로드
        await this.downloadMedia(messages, channel.name);
        console.log(`  미디어 다운로드 완료`);
        
        // URL 처리 및 메가 파일 다운로드
        console.log(`  URL 처리 및 메가 파일 다운로드 시작...`);
        const urlStats = await utils.processMessageUrls(messages, channelDir);
        console.log(`  URL 처리 완료: 총 ${urlStats.total}개 URL (메가: ${urlStats.mega}개, 기타: ${urlStats.other}개)`);
      }
      
      console.log('서버 데이터 수집 완료!');
      console.log(`모든 데이터가 ${this.outputDir} 디렉토리에 저장되었습니다.`);
    } catch (error) {
      console.error('서버 데이터 수집 중 오류 발생:', error);
    }
  }
  
  /**
   * 특정 채널만 데이터 수집
   * @param {Array<string>} channelIds 수집할 채널 ID 배열
   * @param {number} messageLimit 채널당 가져올 메시지 수 (기본값: 1000)
   */
  async scrapeSpecificChannels(channelIds, messageLimit = 1000) {
    try {
      if (!Array.isArray(channelIds) || channelIds.length === 0) {
        throw new Error('채널 ID 배열이 비어 있습니다. 최소 하나 이상의 채널 ID를 지정하세요.');
      }
      
      console.log(`특정 채널 데이터 수집 시작... (${channelIds.length}개 채널)`);
      
      // 서버 정보 가져오기
      const serverInfo = await this.getServerInfo();
      console.log(`서버: ${serverInfo.name} (${serverInfo.id})`);
      
      // 서버 정보 저장
      await utils.saveJsonFile(serverInfo, path.join(this.outputDir, 'server_info.json'));
      
      // 서버 아이콘 다운로드
      if (serverInfo.icon) {
        await utils.downloadFile(serverInfo.icon, path.join(this.outputDir, 'server_icon.png'));
      }
      
      // 직접 채널 처리
      for (const channelId of channelIds) {
        try {
          // 채널 정보 가져오기
          const channel = await this.client.channels.fetch(channelId);
          
          if (!channel) {
            console.error(`채널 ID ${channelId}를 찾을 수 없습니다.`);
            continue;
          }
          
          console.log(`채널 처리 중: ${channel.name} (${channel.id})`);
          
          // 채널 디렉토리 생성
          const channelDir = path.join(this.outputDir, utils.sanitizeFilename(channel.name));
          await utils.ensureDir(channelDir);
          
          // 메시지 가져오기
          const messages = await this.getMessages(channel.id, messageLimit);
          console.log(`  ${messages.length}개 메시지 수집됨`);
          
          // 메시지 저장
          await utils.saveJsonFile(messages, path.join(channelDir, 'messages.json'));
          
          // 메시지 텍스트 저장 (읽기 쉬운 형식)
          const textContent = messages.map(msg => 
            `[${new Date(msg.createdAt).toLocaleString()}] ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`
          ).join('\n');
          await utils.saveTextFile(textContent, path.join(channelDir, 'messages.txt'));
          
          // 미디어 다운로드
          await this.downloadMedia(messages, channel.name);
          console.log(`  미디어 다운로드 완료`);
          
          // URL 처리 및 메가 파일 다운로드
          console.log(`  URL 처리 및 메가 파일 다운로드 시작...`);
          const urlStats = await utils.processMessageUrls(messages, channelDir);
          console.log(`  URL 처리 완료: 총 ${urlStats.total}개 URL (메가: ${urlStats.mega}개, 기타: ${urlStats.other}개)`);
        } catch (channelError) {
          console.error(`채널 ID ${channelId} 처리 중 오류 발생:`, channelError.message);
        }
      }
      
      console.log('특정 채널 데이터 수집 완료!');
      console.log(`모든 데이터가 ${this.outputDir} 디렉토리에 저장되었습니다.`);
    } catch (error) {
      console.error('채널 데이터 수집 중 오류 발생:', error);
    }
  }

  /**
   * 클라이언트 종료
   */
  async close() {
    await this.client.destroy();
    console.log('Discord 클라이언트 종료됨');
  }
}

module.exports = DiscordScraper;
