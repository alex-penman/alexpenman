# Phase 5: Complete Deployment Guide

## System Requirements

### Backend (Python GPT-SoVITS Service)

**Minimum:**
- Python 3.8+
- 4GB RAM
- 1GB GPU VRAM (optional, runs on CPU)

**Recommended:**
- Python 3.10+
- 8GB RAM
- 6GB GPU VRAM (CUDA 11.8+)

**Dependencies:**
- Flask 2.3+
- PyTorch 2.0+
- GPT-SoVITS
- librosa
- soundfile

### Frontend (Next.js Application)

**Build Requirements:**
- Node.js 18+
- npm 9+

**Runtime:**
- Node.js 18+ (if self-hosted)
- Or: Vercel (recommended)

### Database

- PostgreSQL 12+
- 1GB storage minimum
- Automated backups

## Backend Deployment

### Option A: Self-Hosted (VPS/Server)

#### Step 1: Prepare Server

```bash
# SSH into your server
ssh user@your-server.com

# Create project directory
mkdir -p /opt/ai-avatar
cd /opt/ai-avatar

# Clone or copy project
git clone https://github.com/yourusername/ai-avatar.git .
# or: scp -r . user@server:/opt/ai-avatar/

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements-voice.txt

# Create directories for models
mkdir -p /opt/ai-avatar/models
mkdir -p /opt/ai-avatar/logs
mkdir -p /opt/ai-avatar/cache
```

#### Step 2: Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
FLASK_ENV=production
FLASK_DEBUG=0
PORT=8000
WORKERS=4
TIMEOUT=600
LOG_LEVEL=INFO
MODEL_CACHE_DIR=/opt/ai-avatar/models
LOG_DIR=/opt/ai-avatar/logs
EOF
```

#### Step 3: Run Service

```bash
# Option A: Direct (development)
python voice_backend.py

# Option B: Gunicorn (production)
gunicorn --workers 4 --timeout 600 --bind 0.0.0.0:8000 voice_backend:app

# Option C: Systemd service (persistent)
# Create /etc/systemd/system/ai-avatar-backend.service
[Unit]
Description=AI Avatar Voice Backend
After=network.target

[Service]
Type=notify
User=ai-avatar
WorkingDirectory=/opt/ai-avatar
Environment="PATH=/opt/ai-avatar/venv/bin"
ExecStart=/opt/ai-avatar/venv/bin/gunicorn \
  --workers 4 \
  --timeout 600 \
  --bind unix:/opt/ai-avatar/backend.sock \
  voice_backend:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable ai-avatar-backend
sudo systemctl start ai-avatar-backend
```

#### Step 4: Setup Reverse Proxy (nginx)

```nginx
# /etc/nginx/sites-available/ai-avatar-backend
upstream ai_avatar_backend {
    server unix:/opt/ai-avatar/backend.sock fail_timeout=0;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS headers
    add_header Access-Control-Allow-Origin "https://yourdomain.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://ai_avatar_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://ai_avatar_backend;
        access_log off;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/ai-avatar-backend \
  /etc/nginx/sites-enabled/

sudo certbot certonly --nginx -d api.yourdomain.com

sudo systemctl reload nginx
```

#### Step 5: Monitoring

```bash
# Monitor service status
sudo systemctl status ai-avatar-backend

# View logs
sudo journalctl -u ai-avatar-backend -f

# Monitor performance
watch -n 1 'ps aux | grep gunicorn'
```

### Option B: Cloud Deployment (Railway.app)

#### Step 1: Setup Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Select Python environment
# Choose PostgreSQL addon
```

#### Step 2: Configure Build

Create `railway.json`:
```json
{
  "build": {
    "builder": "dockerfile"
  },
  "deploy": {
    "restartPolicyCondition": "on-failure",
    "restartPolicyMaxRetries": 5
  }
}
```

Create `Dockerfile`:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements-voice.txt .
RUN pip install --no-cache-dir -r requirements-voice.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "--workers", "4", "--timeout", "600", \
     "--bind", "0.0.0.0:8000", "voice_backend:app"]
```

#### Step 3: Deploy

```bash
# Push to Railway
railway up

# View logs
railway logs

# Set environment variables
railway variables set FLASK_ENV=production
railway variables set LOG_LEVEL=INFO

# Get deployment URL
railway env
```

## Frontend Deployment

### Option A: Vercel (Recommended)

#### Step 1: Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# On first deploy, answer prompts:
# - Link to existing project? No
# - Project name: ai-avatar
# - Framework: Next.js
# - Root directory: ./
```

#### Step 2: Configure Environment

```bash
# Set environment variables in Vercel dashboard
vercel env add
# Add variables:
# OPENAI_API_KEY=sk-...
# DATABASE_URL=postgresql://...
# PYTHON_BACKEND_URL=https://api.yourdomain.com
# NEXT_PUBLIC_API_URL=https://yourdomain.com
```

#### Step 3: Production Build

```bash
# Test build locally
npm run build

# Deploy to production
vercel --prod
```

### Option B: Self-Hosted (Docker)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Deploy:
```bash
# Build image
docker build -t ai-avatar:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e DATABASE_URL=$DATABASE_URL \
  -e PYTHON_BACKEND_URL=$PYTHON_BACKEND_URL \
  --restart unless-stopped \
  --name ai-avatar \
  ai-avatar:latest

# Check logs
docker logs -f ai-avatar

# Stop container
docker stop ai-avatar
```

### Option C: Docker Compose (Complete Stack)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_avatar
      POSTGRES_USER: ai_avatar
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      FLASK_ENV: production
      PYTHON_BACKEND_URL: http://backend:8000
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DATABASE_URL: postgresql://ai_avatar:${DB_PASSWORD}@postgres:5432/ai_avatar
      PYTHON_BACKEND_URL: http://backend:8000
      NEXT_PUBLIC_API_URL: https://yourdomain.com
    ports:
      - "3000:3000"
    depends_on:
      - backend
      - postgres

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
```

Deploy:
```bash
# Create .env file
cat > .env << 'EOF'
DB_PASSWORD=secure_password_here
OPENAI_API_KEY=sk-...
EOF

# Deploy all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Database Setup

### PostgreSQL Migration

```bash
# Connect to database
psql $DATABASE_URL

# Create extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

# Create tables (if not exists from migrations)
-- Run any pending migrations from app

# Verify tables
\dt mind.*

# Create backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20240210.sql
```

### Automated Backups

```bash
# Create backup script
cat > /opt/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/ai-avatar/backups"
DB_URL="$DATABASE_URL"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump $DB_URL | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/backup-database.sh

# Schedule with cron
(crontab -l; echo "0 2 * * * /opt/backup-database.sh") | crontab -
```

## SSL/TLS Certificates

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Create certificate
sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check status
sudo systemctl status certbot.timer
```

## Monitoring & Logging

### Application Monitoring

```bash
# Install PM2 (process manager)
npm install -g pm2

# Start application
pm2 start npm --name ai-avatar -- start

# Monitor
pm2 monit

# View logs
pm2 logs ai-avatar

# Setup auto-restart
pm2 startup
pm2 save
```

### Error Tracking (Sentry)

```bash
# Install Sentry SDK
npm install @sentry/next @sentry/tracing

# Configure in next.config.js
withSentryConfig(nextConfig, {
  org: "your-org",
  project: "ai-avatar",
  authToken: process.env.SENTRY_AUTH_TOKEN,
})

# Set environment variables
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_DSN=https://...@sentry.io/...
```

### Performance Monitoring

```bash
# Install New Relic (optional)
npm install newrelic

# Add to entry point
require('newrelic');
```

## Post-Deployment Checklist

### Verification
- [ ] Backend API responds to `/health` endpoint
- [ ] Frontend loads without console errors
- [ ] Authentication works (login/logout)
- [ ] Avatar setup completes successfully
- [ ] Voice recording and synthesis works
- [ ] Chat with AI responds correctly
- [ ] Avatar animates with audio playback
- [ ] No TypeScript errors in production build
- [ ] No ESLint warnings in code

### Security
- [ ] HTTPS/SSL enabled
- [ ] CORS properly configured
- [ ] API keys in environment variables (not in code)
- [ ] Database credentials secured
- [ ] Rate limiting enabled on API
- [ ] CSRF protection active
- [ ] Security headers set (Content-Security-Policy, etc.)
- [ ] Dependencies audited (`npm audit`)

### Performance
- [ ] Page load time <3s desktop
- [ ] Page load time <5s mobile
- [ ] API response time <500ms p95
- [ ] Database queries optimized
- [ ] CDN enabled for static assets
- [ ] Caching headers configured
- [ ] Images optimized and lazy-loaded
- [ ] Code splitting working

### Operations
- [ ] Logs accessible and readable
- [ ] Error tracking configured
- [ ] Monitoring alerts configured
- [ ] Database backups automated
- [ ] Deployment process documented
- [ ] Rollback procedure tested
- [ ] Team access configured
- [ ] On-call rotation established

## Rollback Procedure

### If Deployment Fails

#### Vercel
```bash
# View deployment history
vercel deployments

# Rollback to previous version
vercel rollback
```

#### Docker
```bash
# Stop current container
docker-compose down

# Restore from backup
docker-compose pull  # Get old version
docker-compose up -d

# Or restore database from backup
psql $DATABASE_URL < backup_20240209.sql.gz
```

#### Git
```bash
# Revert commits
git revert HEAD
git push

# Or reset to previous version
git reset --hard previous_version_hash
git push --force-with-lease
```

## Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose with load balancer
services:
  backend:
    deploy:
      replicas: 3  # Multiple backend instances

  frontend:
    deploy:
      replicas: 2  # Multiple frontend instances

  redis:  # Add caching layer
    image: redis:latest
```

### Performance Optimization

1. **Database**: Add read replicas, optimize queries
2. **Caching**: Redis for session/response caching
3. **CDN**: CloudFlare for static assets
4. **Message Queue**: Add async job processing (Celery)
5. **Metrics**: Prometheus + Grafana for monitoring

## Troubleshooting

### Common Issues

**Backend not responding:**
```bash
# Check service status
sudo systemctl status ai-avatar-backend

# Check logs
sudo journalctl -u ai-avatar-backend -n 50

# Restart service
sudo systemctl restart ai-avatar-backend
```

**High CPU usage:**
```bash
# Check processes
ps aux | grep gunicorn

# Reduce workers or optimize code
# Monitor with: top, htop, or New Relic
```

**Database connection issues:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
SELECT count(*) FROM pg_stat_activity;
```

**Memory leaks:**
```bash
# Monitor memory usage
free -h

# Check Node memory
node --max-old-space-size=4096 node_modules/.bin/next start
```

---

## Deployment Summary

✅ **Backend**: Python Flask service with GPT-SoVITS
✅ **Frontend**: Next.js application with React
✅ **Database**: PostgreSQL for persistence
✅ **SSL**: Let's Encrypt HTTPS certificates
✅ **Monitoring**: Error tracking & performance metrics
✅ **Backups**: Automated daily backups
✅ **Scaling**: Ready for horizontal scaling

**Next Steps:**
1. Choose deployment option (self-hosted or cloud)
2. Follow setup steps for your choice
3. Run post-deployment checklist
4. Monitor metrics and logs
5. Plan scaling strategy

---

**Deployment Status:** Ready for production
**Estimated Setup Time:** 1-2 hours
**Maintenance Required:** Monthly updates, daily backup verification
