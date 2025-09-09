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
3. Set environment variables (including LINE) manually

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

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secret
- [ ] Configure CORS origins properly
- [ ] Set up SSL/HTTPS
- [ ] Configure proper database connection pooling
- [ ] Set up monitoring and logging
- [ ] Verify LINE notifications work
- [ ] Verify all API endpoints work
- [ ] Run health checks

## Notification Setup (LINE)

1. Set LINE environment variables
2. Insert `line_user_id` rows into `line_tokens` table
3. Place a test order via API and verify messages arrive

## Database Migration

Run after deployment:
```bash
npm run init-db
```

Or use the SQL file in `src/models/database.sql` to initialize your database schema.
