# Azure Secrets Checker

A Node.js application that monitors Azure Enterprise Applications secrets and certificates expiration dates, sending automated email notifications when they are about to expire or have already expired.

## Features

- 🔐 **Monitor Azure Secrets**: Automatically retrieves all Azure Enterprise Applications and their associated secrets and certificates
- 📧 **Email Notifications**: Supports both SMTP and Azure Communication Services for sending alerts
- ⏰ **Scheduled Monitoring**: Daily automated checks with configurable notification thresholds
- 🚀 **REST API**: Provides endpoints to query applications and their secrets programmatically
- 🐳 **Docker Ready**: Fully containerized application with multi-architecture support
- 🔄 **CI/CD Pipeline**: Automated builds and deployments via GitHub Actions

## Requirements

- Node.js 20+
- Azure AD Application with Microsoft Graph API permissions
- Email service (SMTP or Azure Communication Services)

## Azure Permissions Required

Your Azure AD Application needs the following Microsoft Graph API permissions:

- `Application.Read.All` (Application)
- `Directory.Read.All` (Application)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Azure Configuration
TENANT_ID=your-azure-tenant-id
CLIENT_ID=your-azure-client-id
CLIENT_SECRET=your-azure-client-secret

# Mail Configuration
MAIL_TO=admin@company.com
MAIL_FROM=noreply@company.com

# SMTP Configuration (required if MAIL_PROVIDER=SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Azure Communication Services (required if MAIL_PROVIDER=ACS)
ACS_KEY=your-acs-key
ACS_ENDPOINT=endpoint=https://your-acs-resource.communication.azure.com/

# Server Configuration
PORT=3000
HOST=0.0.0.0
```

## Installation & Usage

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/azure-secrets-checker.git
   cd azure-secrets-checker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

   Or for development with watch mode:
   ```bash
   npm run dev
   ```

### Docker

1. **Build the Docker image**:
   ```bash
   docker build -t azure-secrets-checker .
   ```

2. **Run with Docker**:
   ```bash
   docker run -d \\
     --name azure-secrets-checker \\
     --env-file .env \\
     -p 3000:3000 \\
     azure-secrets-checker
   ```

3. **Using Docker Compose** (create `docker-compose.yml`):
   ```yaml
   version: '3.8'
   services:
     azure-secrets-checker:
       image: lory1990/azure-secrets-checker:latest
       container_name: azure-secrets-checker
       environment:
         - TENANT_ID=${TENANT_ID}
         - CLIENT_ID=${CLIENT_ID}
         - CLIENT_SECRET=${CLIENT_SECRET}
         - MAIL_PROVIDER=${MAIL_PROVIDER}
         - MAIL_TO=${MAIL_TO}
         - MAIL_FROM=${MAIL_FROM}
         - SMTP_HOST=${SMTP_HOST}
         - SMTP_PORT=${SMTP_PORT}
         - SMTP_USER=${SMTP_USER}
         - SMTP_PASS=${SMTP_PASS}
         - ACS_CONNECTION_STRING=${ACS_CONNECTION_STRING}
         - PORT=3000
       ports:
         - "3000:3000"
       restart: unless-stopped
   ```

   Run with:
   ```bash
   docker-compose up -d
   ```

### Using Pre-built Image

```bash
docker run -d \\
  --name azure-secrets-checker \\
  --env-file .env \\
  -p 3000:3000 \\
  lory1990/azure-secrets-checker:latest
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/applications` | GET | Get all applications with their secrets and certificates |
| `/applications/expiring` | GET | Get applications with expiring secrets (supports `?days=15,10,5` query parameter) |
| `/check-now` | POST | Run immediate expiration check and send notifications |
| `/test-services` | GET | Test Azure and Mail service connectivity |

### Example API Calls

```bash
# Health check
curl http://localhost:3000/health

# Get all applications
curl http://localhost:3000/applications

# Get applications expiring in specific days
curl "http://localhost:3000/applications/expiring?days=15,10,5,1,0"

# Trigger immediate check
curl -X POST http://localhost:3000/check-now

# Test services
curl http://localhost:3000/test-services
```

## Notification Thresholds

The application sends email notifications when secrets or certificates expire in exactly:
- 15 days
- 10 days
- 5 days
- 4 days
- 3 days
- 2 days
- 1 day
- 0 days (expired)

## Scheduling

The application runs automated checks daily at 9:00 AM (Europe/Rome timezone). You can modify the schedule in `src/scheduler.ts`.

## Project Structure

```
azure-secrets-checker/
├── src/
│   ├── app.ts                 # Fastify server and routes
│   ├── azureService.ts        # Azure Graph API integration
│   ├── mailService.ts         # Email service (SMTP/ACS)
│   ├── scheduler.ts           # Cron job scheduler
│   └── types.ts               # TypeScript interfaces
├── .github/workflows/
│   └── docker-publish.yml     # CI/CD pipeline
├── Dockerfile                 # Docker containerization
├── package.json               # Node.js dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## CI/CD Pipeline

The project includes a GitHub Actions workflow that:

1. **Builds** the Docker image on every push to main branch
2. **Pushes** to Docker Hub with tags:
   - `lory1990/azure-secrets-checker:latest`
   - `lory1990/azure-secrets-checker:<git-sha>`
3. **Supports** multi-architecture builds (linux/amd64, linux/arm64)

### Required GitHub Secrets

Configure these secrets in your GitHub repository:

- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token

## Monitoring

The application provides comprehensive logging and includes:

- Health check endpoint for monitoring tools
- Detailed error logging for troubleshooting
- Service connectivity tests
- Docker health checks

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Verify your Azure credentials and ensure the service principal has the required Graph API permissions.

2. **Mail Service Connection Failed**: Check your SMTP settings or ACS connection string.

3. **No Applications Found**: Ensure your service principal has read access to Azure AD applications.

### Logs

Check application logs for detailed error information:

```bash
# Docker logs
docker logs azure-secrets-checker

# Local development
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

1. Check the [Issues](https://github.com/your-username/azure-secrets-checker/issues) page
2. Create a new issue with detailed information about your problem
3. Include logs and configuration (without sensitive information)