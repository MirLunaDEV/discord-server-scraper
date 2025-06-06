# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Send an email to [iris.iwall@gmail.com] with details about the vulnerability
3. Include steps to reproduce the issue if possible
4. Allow reasonable time for the issue to be addressed before public disclosure

## Security Considerations

### Discord Credentials

- **Never share your Discord credentials or tokens**
- **Never commit the `.env` file to version control**
- Store credentials securely and use environment variables
- Regularly rotate your Discord password and tokens

### Data Privacy

- Be aware of the privacy implications of scraping Discord data
- Respect the privacy of server members
- Only scrape data you have permission to access
- Consider data retention and deletion policies

### Legal Compliance

- Ensure compliance with Discord's Terms of Service
- Respect copyright and intellectual property rights
- Follow applicable laws and regulations in your jurisdiction
- Obtain necessary permissions before scraping data

### Technical Security

- Keep dependencies up to date
- Use the latest version of Node.js
- Regularly review and audit the code
- Be cautious when running scripts with elevated privileges

## Best Practices

1. **Use dedicated accounts**: Consider using a separate Discord account for scraping
2. **Rate limiting**: Respect Discord's API rate limits to avoid detection
3. **Monitoring**: Be aware that Discord may detect and restrict automated activities
4. **Backup**: Regularly backup your scraped data securely
5. **Cleanup**: Remove temporary files and logs that may contain sensitive information

## Disclaimer

This tool is provided for educational purposes only. Users are responsible for:

- Complying with Discord's Terms of Service
- Respecting privacy and data protection laws
- Obtaining necessary permissions
- Using the tool ethically and responsibly

The developers are not responsible for any misuse or legal consequences resulting from the use of this tool.
