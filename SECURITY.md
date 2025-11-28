# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Tavily Chat Agent seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

Please **DO NOT** report security vulnerabilities through public GitHub issues.

Instead, please report them via email to:
- Security Team: [deansa@tavily.com](mailto:deansa@tavily.com)

### What to Include

Please include the following information:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Detailed Response**: Within 7 days
- **Fix Timeline**: Depends on complexity, typically 30-90 days

### Disclosure Policy

- Report the vulnerability privately
- Allow reasonable time for a fix before public disclosure
- We will acknowledge your report and keep you updated on progress
- Once fixed, we will publicly disclose the vulnerability (with your permission)

## Security Best Practices

### API Keys

- **Never commit API keys** to version control
- Use `.env` files and add them to `.gitignore`
- Rotate API keys regularly
- Use different keys for development and production

### File Uploads

- File uploads are restricted to specific types (PDF, TXT, MD, DOCX, CSV, HTML)
- Maximum file size is configurable (default: 10MB)
- Filenames are sanitized to prevent path traversal attacks
- File content is validated before processing

### Rate Limiting

- API endpoints are rate-limited to prevent abuse
- Default: 10 requests per minute per IP address
- Configurable via environment variables

### Input Validation

- All user inputs are sanitized and validated
- Thread IDs must match specific patterns
- Text inputs have maximum length limits
- SQL injection prevention through parameterized queries

### Authentication

- Tavily API key validation on each request
- No authentication bypass possible
- API keys transmitted via Authorization header

## Security Features

### 🔒 Implemented Security Measures

1. **Input Sanitization**
   - All user inputs sanitized before processing
   - File upload validation and sanitization
   - Thread ID validation with regex patterns

2. **Rate Limiting**
   - Per-IP rate limiting on all endpoints
   - Configurable limits via environment variables
   - Protection against DDoS and brute force attacks

3. **File Upload Security**
   - File type whitelist
   - File size limits
   - Filename sanitization
   - Content validation
   - Executable file detection and blocking

4. **Error Handling**
   - Structured logging without sensitive data exposure
   - Generic error messages to users
   - Detailed logs for debugging (server-side only)

5. **CORS Configuration**
   - Restricted to configured frontend URL
   - No wildcard origins allowed

6. **Docker Security**
   - Non-root user in containers
   - Minimal base images (Alpine/Slim)
   - Health checks for container monitoring
   - No secrets in Docker images

7. **Database Security**
   - Parameterized queries (SQLAlchemy ORM)
   - Connection pooling with health checks
   - Optional SSL/TLS connections

### 🔧 Recommended Additional Measures

1. **HTTPS/TLS**
   - Use HTTPS in production
   - Implement TLS for database connections
   - Use secure WebSocket connections

2. **API Gateway**
   - Consider using an API gateway for additional security
   - Implement OAuth2 for user authentication (future)

3. **Secrets Management**
   - Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
   - Don't store secrets in environment variables in production

4. **Monitoring**
   - Enable Sentry for error tracking
   - Monitor for unusual patterns
   - Set up alerts for security events

## Vulnerability Disclosure

Past vulnerabilities will be listed here once identified and fixed.

### Known Limitations

1. **File Storage**: Uploaded files are stored on disk without encryption
2. **Conversation Storage**: Conversations stored as markdown files (not encrypted)
3. **API Key Storage**: API keys stored in environment variables

## Security Updates

Subscribe to release notifications to stay informed about security updates:
- Watch this repository on GitHub
- Enable notifications for new releases

## Contact

For general security questions:
- Email: [deansa@tavily.com](mailto:deansa@tavily.com)

For urgent security issues:
- Email: [deansa@tavily.com](mailto:deansa@tavily.com) with "URGENT SECURITY" in subject
