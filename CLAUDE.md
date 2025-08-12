# Timing API - Claude Development Context

## Project Overview

Node.js/Express API for order management system with OneSignal push notifications, LINE messaging, and PostgreSQL database integration via Supabase.

## Architecture

- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT for admin users
- **Notifications**: OneSignal for push notifications, LINE Messaging API for chat notifications
- **Security**: Helmet, CORS, rate limiting, input validation

## Database Schema

````sql
-- Core tables
- admin_users: Admin authentication with OneSignal player IDs
- menus: Menu items with customizations and image URLs
- orders: Customer orders with status tracking
- order_items: Individual items within orders

## API Endpoints

### Customer Endpoints (Public)
- `GET /api/menu` - Fetch menu with categories
- `POST /api/orders` - Create new order (triggers admin notifications)
- `GET /api/orders/:id/status` - Check order status

### Admin Endpoints (JWT Required)
- `GET /api/admin/orders` - All orders with filters (status, date)
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET/POST/PUT/DELETE /api/admin/menu` - Full menu CRUD
- `GET /api/admin/sales/today` - Daily sales summary
- `POST /api/admin/test-notification` - Test OneSignal notifications
- `POST /api/admin/test-line-notification` - Test LINE notifications
- `POST /api/admin/line-token` - Store LINE user ID for notifications

### LINE Bot Endpoints
- `POST /api/line/webhook` - LINE Bot webhook for receiving events

## Environment Configuration
```env
PORT=8000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:Timing%24upabase@db.kzerorfeuabowkimywnf.supabase.co:5432/postgres"

# OneSignal Configuration
ONESIGNAL_APP_ID="your-onesignal-app-id"
ONESIGNAL_REST_API_KEY="your-onesignal-rest-api-key"

# LINE Messaging API Configuration
LINE_CHANNEL_ACCESS_TOKEN="your-line-channel-access-token"
LINE_CHANNEL_SECRET="your-line-channel-secret"
````

## Development Commands

```bash
npm install          # Install dependencies
npm run dev         # Start development server with nodemon (uses .env.development)
npm run start       # Start production server (uses .env)
npm run start:dev   # Start with development environment
npm run start:prod  # Start with production environment
npm run dev:prod    # Development server with production environment
npm run init-db     # Initialize database schema
npm run docs        # Show API documentation URL
```

## Environment Configuration

The project uses environment-specific configuration files:

- `.env.example` - Template file with placeholder values
- `.env.development` - Development environment configuration
- `.env.production` - Production environment configuration
- `.env` - Default environment file (fallback)

### Setup Instructions

1. **Development Setup:**
   ```bash
   cp .env.example .env.development
   # Update .env.development with development credentials
   npm run dev
   ```

2. **Production Setup:**
   ```bash
   cp .env.example .env.production
   # Update .env.production with production credentials
   npm run start:prod
   ```

### Environment Variables

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 8000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secure secret for JWT tokens
- `FIREBASE_*` - Firebase Admin SDK configuration

## API Documentation

- **Swagger UI**: Available at `http://localhost:8000/api-docs`
- **Interactive testing**: All endpoints can be tested directly from Swagger UI
- **Schema validation**: Complete request/response schemas documented
- **Authentication**: JWT Bearer token authentication documented

## Current Status

### ✅ Completed Features

- Express server with security middleware
- All API endpoints implemented with validation
- OneSignal integration for push notifications
- LINE Messaging API integration for chat notifications
- JWT authentication system
- PostgreSQL models and schema
- Real database integration with PostgreSQL
- Error handling and logging
- Menu image URL support with validation

### ✅ Production Ready

- **Database Connection**: Working with Supabase production pooler
- **All endpoints tested and functional**
- **Admin authentication working with JWT**
- **OneSignal notifications configured and ready**

### 🔧 Database Connection

- **Working Connection**: `aws-0-ap-southeast-1.pooler.supabase.com:6543`
- **Password**: `Timing$upabase` (URL encoded as `Timing%24upabase`)
- **SSL**: Required with `rejectUnauthorized: false`
- **Admin Credentials**: `username: admin`, `password: admin123`

## OneSignal Integration

- Configured for push notifications to admin devices
- Sends notifications when new orders are created
- Supports multiple admin devices via OneSignal player IDs
- Includes order details in notification payload

## LINE Messaging Integration

- LINE Bot webhook for receiving user messages and events
- Rich message templates with order details and status updates
- Admin registration via chat commands ("register admin")
- Support for both Thai and English interfaces
- Automatic user management (follow/unfollow events)
- Flex message format for better visual presentation

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- JWT token authentication
- Password hashing with bcryptjs

## File Structure

```
src/
├── config/
│   ├── database.js     # PostgreSQL connection
│   └── onesignal.js    # OneSignal client setup
├── middleware/
│   ├── auth.js         # JWT authentication
│   └── validation.js   # Input validation rules
├── models/
│   ├── OneSignalToken.js # OneSignal player ID operations
│   ├── Menu.js         # Menu item operations with image URL support
│   ├── Order.js        # Order management
│   └── database.sql    # Database schema
├── routes/
│   ├── admin.js        # Admin API endpoints
│   ├── customer.js     # Customer API endpoints
│   └── customer-mock.js # Mock data fallback
├── services/
│   └── oneSignalNotificationService.js # OneSignal notifications
├── utils/
│   └── constants.js    # Application constants
└── server.js          # Main application entry
```

## Testing Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Get menu
curl http://localhost:8000/api/menu

# Create order
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_info":{"name":"John"},"items":[{"menu_id":1,"quantity":1,"price":3.50}],"total":3.50}'

# Create menu item with image URL (requires JWT token)
curl -X POST http://localhost:8000/api/admin/menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Cappuccino","category":"Coffee","base_price":4.50,"image_url":"https://example.com/cappuccino.jpg","customizations":{"sizes":["Small","Medium","Large"]},"active":true}'

## Production Deployment Notes
- Server runs on port 8000 by default
- Requires valid Supabase database connection
- OneSignal App ID and REST API key needed for notifications
- JWT_SECRET should be cryptographically secure
- Enable HTTPS in production
- Configure proper CORS origins

## Development Context for Claude
When working on this project:
1. Always test database connectivity before implementing new features
2. Use mock data routes when database is unavailable
3. Validate all inputs and handle errors gracefully
4. Test OneSignal notifications with real player IDs
5. Maintain consistent JSON response format
6. Follow existing code patterns and conventions
7. Run `npm run dev` to start development server
8. Database schema is in `src/models/database.sql`
```
