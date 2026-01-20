# Security Policy

## Supported Versions

The following versions of Security Guard HRM SaaS are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities.
2. Send a detailed report to our security team via email (or use GitHub's private vulnerability reporting feature).
3. Include the following information in your report:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact of the vulnerability
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**.
- **Initial Assessment**: We will provide an initial assessment within **5 business days**.
- **Resolution Timeline**: We aim to resolve critical vulnerabilities within **30 days**.
- **Credit**: We will credit you in our security acknowledgments (unless you prefer to remain anonymous).

## Security Best Practices

This project follows these security practices:

### Authentication & Authorization
- JWT-based authentication with secure token handling
- Role-based access control (RBAC) for all endpoints
- Row-Level Security (RLS) policies in Supabase
- Secure password hashing using bcrypt

### Data Protection
- All data transmitted over HTTPS/TLS
- Sensitive data encrypted at rest
- Environment variables for secrets management
- No sensitive data logged or exposed in error messages

### Dependencies
- Regular dependency updates via Dependabot
- Automated security vulnerability scanning
- Minimal dependency footprint

### API Security
- Input validation on all endpoints using Zod schemas
- Rate limiting on authentication endpoints
- CORS configuration for allowed origins
- SQL injection prevention through parameterized queries

## Security Headers

The application implements the following security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)

## Third-Party Security

- **Supabase**: Database and authentication infrastructure
- **LINE Login**: OAuth 2.0 integration for employee authentication
- All third-party integrations follow security best practices

## Contact

For security concerns, please use GitHub's private vulnerability reporting feature or contact the repository maintainers directly.

---

Thank you for helping keep Security Guard HRM SaaS and our users safe!
