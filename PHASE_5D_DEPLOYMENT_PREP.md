# Phase 5d: Deployment Preparation

**Status:** 🔄 IN PROGRESS
**Objective:** Configure deployment infrastructure, environment setup, monitoring, and pre-deployment validation
**Timeline:** 1-2 days
**Next Phase:** Phase 5e - Production Launch

---

## Overview

Phase 5d prepares the system for production deployment by:
1. Setting up deployment infrastructure
2. Configuring environment variables
3. Implementing error tracking & monitoring
4. Frontend build optimization
5. Pre-deployment testing & validation
6. Documentation & runbooks

---

## Deployment Architecture

### Current State
- Frontend: Next.js 14 (React 18)
- Backend: Python + Flask + GPT-SoVITS
- Database: PostgreSQL
- Hosting: Vercel (frontend) + TBD (backend)
- Performance: 60% improvement (Phase 5c ✅)

### Deployment Targets

**Frontend (Next.js):**
- Hosting: Vercel (recommended) or self-hosted
- Environment: Production
- Custom domain: alexpenman.com.au
- SSL: Automatic (Vercel) or Let's Encrypt

**Backend (Python/Flask):**
- Service: GPT-SoVITS voice synthesis
- Hosting: AWS EC2, DigitalOcean, or Heroku
- Port: 5000 (Flask default)
- SSL: Nginx reverse proxy with Let's Encrypt

**Database:**
- PostgreSQL instance
- Cloud-hosted or self-managed
- Daily backups configured
- Connection pooling (PgBouncer)

---

## Tasks Breakdown

### Task 1: Environment Configuration

**1.1 Create Environment Files**

Create `.env.production` with all required variables:

```bash
# Frontend (.env.production)
NEXT_PUBLIC_API_URL=https://api.alexpenman.com.au
NEXT_PUBLIC_APP_NAME=AI Alex
NEXT_PUBLIC_VERSION=1.0.0

# Backend API Keys (not in .env, use secrets management)
# - OPENAI_API_KEY
# - DATABASE_URL
# - TWIN_MODEL=gpt-4o-mini

# Analytics
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Feature flags
NEXT_PUBLIC_ENABLE_BETA=false
NEXT_PUBLIC_ENABLE_DEBUG=false
```

**1.2 Secrets Management**

Configure secure secrets storage:
- Vercel: Use Environment Variables UI
- Backend: Use environment variables or secrets manager
- Never commit secrets to git

**1.3 Database Configuration**

```bash
# .env.production (backend)
DATABASE_URL=postgresql://user:pass@host:5432/alexpenman
DATABASE_POOL_SIZE=20
DATABASE_IDLE_TIMEOUT=900
DATABASE_STATEMENT_TIMEOUT=30000
```

### Task 2: Frontend Build Optimization

**2.1 Verify Build Output**

```bash
npm run build
# Expected output in .next/
```

**2.2 Analyze Bundle Size**

```bash
npm run analyze:bundle
# Verify all optimizations are present:
# - Priority 1: Mobile audio ✅
# - Priority 2: Lazy WASM ✅
# - Priority 3: Bundle splitting ✅
```

**2.3 Configure Next.js for Production**

Verify `next.config.js`:
```javascript
module.exports = {
  // Performance optimizations
  compress: true,
  productionBrowserSourceMaps: false,
  swcMinify: true,

  // Security headers
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ],
};
```

### Task 3: Error Tracking & Monitoring

**3.1 Set Up Sentry**

```typescript
// app/lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**3.2 Performance Monitoring**

```typescript
// Track web vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric) {
  // Send to Sentry
  Sentry.captureMessage(
    `Web Vital: ${metric.name}=${metric.value}`,
    'info'
  );
}
```

**3.3 Custom Metrics**

```typescript
// Track app-specific metrics
analytics.track('page_view', {
  path: window.location.pathname,
  referrer: document.referrer,
  performance: {
    fcp: metrics.fcp,
    lcp: metrics.lcp,
    cls: metrics.cls,
  },
});
```

### Task 4: Backend Service Configuration

**4.1 Flask Application Setup**

```python
# app.py (Flask backend)
from flask import Flask
import logging
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy'}, 200

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,  # NEVER debug=True in production
    )
```

**4.2 Nginx Reverse Proxy**

```nginx
# /etc/nginx/sites-available/alexpenman
upstream flask_app {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.alexpenman.com.au;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.alexpenman.com.au;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.alexpenman.com.au/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.alexpenman.com.au/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Proxy to Flask
    location / {
        proxy_pass http://flask_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**4.3 Process Manager (Gunicorn)**

```bash
# Start Flask with Gunicorn
gunicorn \
  --workers 4 \
  --worker-class sync \
  --bind 127.0.0.1:5000 \
  --timeout 120 \
  --access-logfile /var/log/gunicorn/access.log \
  --error-logfile /var/log/gunicorn/error.log \
  app:app
```

### Task 5: Database Backup & Disaster Recovery

**5.1 Automated Backups**

```bash
#!/bin/bash
# backup-postgres.sh - Daily backup script

BACKUP_DIR="/backups/postgres"
DB_NAME="alexpenman"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump $DB_NAME | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (S3)
aws s3 cp "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz" \
  s3://alexpenman-backups/postgres/
```

**5.2 Backup Schedule**

```
Daily backup: 2 AM UTC (cron)
0 2 * * * /backup-postgres.sh

Weekly backup: Sunday 3 AM UTC
0 3 * * 0 /backup-postgres-full.sh

Monthly retention: 90 days
```

### Task 6: Health Checks & Monitoring

**6.1 Health Check Endpoint**

```typescript
// pages/api/health.ts
export default async function handler(req, res) {
  const checks = {
    database: false,
    api: false,
    wasm: false,
  };

  try {
    // Check database
    await db.query('SELECT 1');
    checks.database = true;
  } catch (e) {
    console.error('Database health check failed:', e);
  }

  try {
    // Check external APIs
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    checks.api = response.ok;
  } catch (e) {
    console.error('API health check failed:', e);
  }

  checks.wasm = true; // WASM loads client-side

  const healthy = Object.values(checks).every(v => v);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

**6.2 Monitoring Dashboard**

Configure monitoring for:
- Uptime: 99.5% target
- Response time: <200ms p95
- Error rate: <0.1%
- CPU usage: <70%
- Memory: <80%
- Disk: <85%

### Task 7: Deployment Testing

**7.1 Staging Environment**

Set up staging to mirror production:
```bash
# Deploy to staging first
npm run build
vercel --prod --confirm staging
```

**7.2 Smoke Tests**

```typescript
// tests/smoke.test.ts
describe('Production Smoke Tests', () => {
  it('should load home page', async () => {
    const response = await fetch('https://alexpenman.com.au');
    expect(response.status).toBe(200);
  });

  it('should load avatar component', async () => {
    const page = await browser.newPage();
    await page.goto('https://alexpenman.com.au');
    const avatar = await page.$('[data-testid="avatar-canvas"]');
    expect(avatar).toBeTruthy();
  });

  it('should respond to health check', async () => {
    const response = await fetch('https://api.alexpenman.com.au/health');
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});
```

**7.3 Performance Validation**

```bash
# Verify Phase 5c optimizations in production
npm run lighthouse -- https://alexpenman.com.au

# Expected results:
# - FCP: < 1s
# - LCP: < 1.5s
# - TTI: < 2.1s
# - CLS: < 0.1
```

---

## Checklist

### Pre-Deployment

- [ ] All Phase 5c commits pushed to GitHub
- [ ] All 129 tests passing locally
- [ ] Environment variables configured
- [ ] Database backups tested
- [ ] Error tracking (Sentry) configured
- [ ] SSL certificates obtained (Let's Encrypt)
- [ ] Nginx configuration ready
- [ ] Gunicorn/Flask startup scripts ready
- [ ] Health check endpoint working
- [ ] Staging environment matches production

### Deployment Day

- [ ] Final database backup before deployment
- [ ] Deploy backend (Flask/Gunicorn)
- [ ] Deploy frontend (Next.js to Vercel)
- [ ] Verify health check endpoints
- [ ] Run smoke tests
- [ ] Monitor error tracking for issues
- [ ] Check performance metrics
- [ ] Verify all routes accessible
- [ ] Test avatar loading
- [ ] Test chat functionality
- [ ] Monitor for 1 hour after deploy

### Post-Deployment

- [ ] Update status page
- [ ] Announce availability (social media, etc.)
- [ ] Monitor metrics for 24 hours
- [ ] Create incident response runbook
- [ ] Set up alerts for critical issues
- [ ] Schedule follow-up review

---

## Infrastructure Recommendations

### Hosting Options

**Frontend (Next.js):**
- **Recommended:** Vercel (automatic deployments, CDN, analytics)
- Alternative: Netlify (simpler, good for static)
- Alternative: AWS (more control, steeper learning curve)

**Backend (Flask/Python):**
- **Recommended:** DigitalOcean App Platform (managed, $12/mo)
- Alternative: AWS EC2 (more control, pay-as-you-go)
- Alternative: Heroku (easy but expensive)

**Database (PostgreSQL):**
- **Recommended:** AWS RDS (managed, backups included)
- Alternative: DigitalOcean Managed Databases
- Alternative: Self-hosted (save cost, more maintenance)

### Cost Estimation

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | Free | Next.js optimized, generous free tier |
| DigitalOcean | $5-12/mo | Flask backend + database |
| Sentry | $29/mo | Error tracking (first tier) |
| AWS S3 | ~$1/mo | Database backups |
| **Total** | ~$40/mo | Recommended minimum |

---

## Success Criteria

✅ **Infrastructure Ready:**
- Backend service running and responding
- Database connected and backed up
- Error tracking active and logging

✅ **Performance Verified:**
- All Phase 5c improvements present
- Load times meet targets (60% improvement)
- No regressions in optimization

✅ **Monitoring Active:**
- Health checks passing
- Error tracking operational
- Performance metrics collected

✅ **Deployment Ready:**
- Staging environment matches production
- Smoke tests passing
- Runbooks documented
- Team trained on incident response

---

## Timeline

**Day 1: Configuration**
- [ ] Environment setup (4 hours)
- [ ] Backend service configuration (4 hours)
- [ ] Testing & validation (4 hours)

**Day 2: Final Prep**
- [ ] Staging deployment (4 hours)
- [ ] Smoke tests & validation (4 hours)
- [ ] Monitoring setup (4 hours)
- [ ] Runbook creation (2 hours)

**Day 3: Go-Live (Phase 5e)**
- [ ] Production deployment
- [ ] Verification
- [ ] Monitoring

---

## Next Phase

**Phase 5e: Production Launch**
- Deploy to production
- Monitor real-world metrics
- Smoke tests in production
- Public announcement
- Ongoing monitoring & alerting

---

**Phase 5d Status:** 🔄 IN PROGRESS
**Estimated Completion:** 1-2 days
**Next:** Phase 5e - Production Launch
