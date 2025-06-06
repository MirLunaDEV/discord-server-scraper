# Discord Server Scraper

A comprehensive Discord server data collection tool that extracts messages, media files, and external links (including MEGA downloads) from Discord servers using user accounts.

## ⚠️ Important Disclaimer

**This tool is for educational purposes only.** Using automated user accounts (self-bots) may violate Discord's Terms of Service and could result in account suspension or termination. Use at your own risk and responsibility.

## 🌟 Features

- **Complete Server Data Collection**: Extract messages from all channels or specific channels
- **Media Download**: Automatically download attached images, videos, documents, and other files
- **MEGA Link Processing**: Detect and automatically download files from MEGA links in messages
- **URL Extraction**: Extract and categorize all URLs found in messages
- **Forum/Media Channel Support**: Handle Discord's forum and media channels with thread processing
- **Flexible Output**: Save data in both JSON and human-readable text formats
- **ZIP and All File Types**: Support for downloading all types of attachments

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- A Discord account with access to the target server

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/discord-server-scraper.git
   cd discord-server-scraper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your Discord credentials and target server ID:
   ```env
   DISCORD_EMAIL=your_discord_email@example.com
   DISCORD_PASSWORD=your_discord_password
   SERVER_ID=123456789012345678
   ```

## 📖 Usage

### Basic Usage (All Channels)

Scrape all channels in the server:
```bash
node index.js
```

### Specific Channels

Scrape specific channels by providing channel IDs:
```bash
node index.js --channels 123456789012345678,876543210987654321
```

### Message Limit

Limit the number of messages per channel:
```bash
node index.js --limit 500
```

### Combined Options

Scrape specific channels with message limit:
```bash
node index.js --channels 123456789012345678 --limit 100
```

### View All Channels

List all channels in the server to find channel IDs:
```bash
node get-all-channels.js
```

### Help

View all available options:
```bash
node index.js --help
```

## 🔧 Configuration

### Getting Discord Credentials

#### Method 1: Email and Password (Recommended)
Simply use your Discord email and password in the `.env` file.

#### Method 2: Discord User Token (Advanced)
1. Open Discord in your web browser
2. Press F12 to open Developer Tools
3. Go to the Network tab
4. Refresh the page
5. Look for any request and check the request headers for 'authorization'
6. Copy this value as your user token

### Getting Server ID

1. Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
2. Right-click on the server name and select "Copy ID"

### Getting Channel ID

1. Enable Developer Mode in Discord
2. Right-click on the channel name and select "Copy ID"

### Two-Factor Authentication

If your account uses 2FA, the program will prompt you to enter the authentication code during login.

## 📁 Output Structure

The scraper organizes data in the following structure:

```
(output directory)/
├── server_info.json           # Server information
├── server_icon.png            # Server icon
├── channels.json              # Channel list
├── [channel-name]/            # Individual channel folders
│   ├── messages.json          # Message data (JSON format)
│   ├── messages.txt           # Message text (readable format)
│   └── links/                 # Extracted links folder
│       ├── all_urls.txt       # All URLs found
│       ├── mega_urls.txt      # MEGA URLs
│       ├── other_urls.txt     # Other URLs
│       ├── extracted_urls.json # URL data (JSON format)
│       └── mega_downloads/    # Downloaded MEGA files
└── media/                     # Media files folder
    └── [channel-name]/        # Channel-specific media
        └── [files]            # Downloaded media files
```

## 🛡️ Security Considerations

- **Never share your Discord credentials or tokens**
- **Never commit the `.env` file to version control**
- **Use this tool responsibly and respect Discord's Terms of Service**
- **Be aware that Discord may detect and restrict automated activities**
- **Consider the privacy and consent of server members**

## ⚖️ Legal Notice

This tool is provided for educational and research purposes only. Users are responsible for:

- Complying with Discord's Terms of Service
- Respecting copyright and intellectual property rights
- Obtaining necessary permissions before scraping data
- Following applicable laws and regulations in their jurisdiction

The developers of this tool are not responsible for any misuse or legal consequences resulting from its use.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [discord.js-selfbot-v13](https://github.com/aiko-chan-ai/discord.js-selfbot-v13) - Discord self-bot library
- [megajs](https://github.com/qgustavor/mega) - MEGA API client

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/discord-server-scraper/issues) page
2. Create a new issue with detailed information about your problem
3. Make sure to remove any sensitive information from your issue description

---

**Remember: Use this tool responsibly and at your own risk!**
