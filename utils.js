const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { URL } = require('url');
const { File, Storage } = require('megajs');
const fileType = require('file-type');

async function ensureDir(dir) {
  await fs.ensureDir(dir);
}

function sanitizeFilename(filename) {
  return filename.replace(/[\\/:*?"<>|]/g, '_');
}
async function downloadFile(url, outputPath) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Download failed: ${url}`, error.message);
  }
}

function getFilenameFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    let filename = path.basename(pathname);

    if (!filename || filename === '' || !path.extname(filename)) {
      const timestamp = Date.now();
      const ext = guessExtensionFromUrl(url) || '.bin';
      filename = `file_${timestamp}${ext}`;
    }

    return sanitizeFilename(filename);
  } catch (error) {
    const timestamp = Date.now();
    return `file_${timestamp}.bin`;
  }
}

function guessExtensionFromUrl(url) {
  if (url.includes('image')) return '.jpg';
  if (url.includes('video')) return '.mp4';
  if (url.includes('audio')) return '.mp3';
  return '';
}

async function saveTextFile(content, outputPath) {
  await fs.writeFile(outputPath, content, 'utf8');
}

async function saveJsonFile(data, outputPath) {
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
}

function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

function isMegaUrl(url) {
  return url.includes('mega.nz') || url.includes('mega.co.nz');
}

// Download file from MEGA link
async function downloadMegaFile(url, outputPath) {
  try {
    console.log(`Starting MEGA download: ${url}`);

    const file = File.fromURL(url);
    await file.loadAttributes();

    const fileStream = file.download();
    const writeStream = fs.createWriteStream(outputPath);

    fileStream.pipe(writeStream);

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log(`MEGA download completed: ${outputPath}`);
        resolve();
      });
      writeStream.on('error', (err) => {
        console.error(`MEGA download failed: ${url}`, err.message);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`MEGA download failed: ${url}`, error.message);
  }
}

// Process URLs found in messages and download MEGA files
async function processMessageUrls(messages, outputDir) {
  const linksDir = path.join(outputDir, 'links');
  await ensureDir(linksDir);

  const allUrls = new Set();
  const megaUrls = new Set();
  const otherUrls = new Set();

  for (const message of messages) {
    if (message.content) {
      const urls = extractUrls(message.content);

      for (const url of urls) {
        allUrls.add(url);

        if (isMegaUrl(url)) {
          megaUrls.add(url);
        } else {
          otherUrls.add(url);
        }
      }
    }
  }

  await saveJsonFile({
    all: Array.from(allUrls),
    mega: Array.from(megaUrls),
    other: Array.from(otherUrls)
  }, path.join(linksDir, 'extracted_urls.json'));

  await saveTextFile(Array.from(allUrls).join('\n'), path.join(linksDir, 'all_urls.txt'));
  await saveTextFile(Array.from(megaUrls).join('\n'), path.join(linksDir, 'mega_urls.txt'));
  await saveTextFile(Array.from(otherUrls).join('\n'), path.join(linksDir, 'other_urls.txt'));

  console.log(`Found ${allUrls.size} URLs (MEGA: ${megaUrls.size}, Other: ${otherUrls.size})`);

  if (megaUrls.size > 0) {
    const megaDir = path.join(linksDir, 'mega_downloads');
    await ensureDir(megaDir);

    console.log(`Starting MEGA downloads (${megaUrls.size} files)...`);

    const downloadPromises = [];

    for (const url of megaUrls) {
      try {
        const file = File.fromURL(url);
        await file.loadAttributes();

        const filename = sanitizeFilename(file.name) || `mega_file_${Date.now()}`;
        const outputPath = path.join(megaDir, filename);

        downloadPromises.push(downloadMegaFile(url, outputPath));
      } catch (error) {
        console.error(`Failed to get MEGA file info: ${url}`, error.message);

        const timestamp = Date.now();
        const outputPath = path.join(megaDir, `mega_file_${timestamp}`);

        downloadPromises.push(downloadMegaFile(url, outputPath));
      }
    }

    await Promise.allSettled(downloadPromises);
    console.log('MEGA downloads completed');
  }

  return {
    total: allUrls.size,
    mega: megaUrls.size,
    other: otherUrls.size
  };
}

module.exports = {
  ensureDir,
  sanitizeFilename,
  downloadFile,
  getFilenameFromUrl,
  saveTextFile,
  saveJsonFile,
  extractUrls,
  isMegaUrl,
  downloadMegaFile,
  processMessageUrls
};
