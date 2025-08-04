# Deployment Guide

## Quick Deploy Options

### 1. Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```
Set environment variables in Railway dashboard.

### 2. Render
1. Connect GitHub repository
2. Use `render.yaml` configuration
3. Set Firebase environment variables manually

### 3. Docker
```bash
# Local Docker run
docker build -t timing-api .
docker run -p 8000:8000 --env-file .env timing-api

# Docker Compose (with local PostgreSQL)
docker-compose up -d
```

## Required Environment Variables

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

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secret
- [ ] Configure CORS origins properly
- [ ] Set up SSL/HTTPS
- [ ] Configure proper database connection pooling
- [ ] Set up monitoring and logging
- [ ] Test Firebase notifications
- [ ] Verify all API endpoints work
- [ ] Run health checks

## Notification Setup

1. Firebase Admin SDK is configured
2. FCM tokens stored in database
3. Notifications sent on new orders
4. Test endpoint: `POST /api/admin/test-notification`

## Database Migration

Run after deployment:
```bash
npm run init-db
```

Or use the SQL file in `src/models/database.sql` to initialize your database schema.