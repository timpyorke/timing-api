# Deployment Guide

## Railway Deployment

### Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

### Environment Variables
Set these in Railway dashboard:

```env
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-secret-key

# Firebase Configuration
FIREBASE_PROJECT_ID=timing-48aba
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@timing-48aba.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
```

### Post-Deployment Setup

1. Initialize database:
```bash
npm run init-db
```

2. Test notifications:
```bash
curl -X POST https://your-app.railway.app/api/admin/test-notification
```

### Production Checklist
- [ ] Environment variables set in Railway
- [ ] Database schema initialized
- [ ] Firebase notifications working
- [ ] API endpoints tested
- [ ] Health check passing