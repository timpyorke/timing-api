# Timing API - Claude Development Context

## Project Overview

Node.js/Express API for order management system with Firebase push notifications and PostgreSQL database integration via Supabase.

## Architecture

- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT for admin users
- **Notifications**: Firebase Admin SDK for push notifications
- **Security**: Helmet, CORS, rate limiting, input validation

## Database Schema

````sql
-- Core tables
- admin_users: Admin authentication with FCM tokens
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
- `POST /api/admin/test-notification` - Test Firebase notifications

## Environment Configuration
```env
PORT=8000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:Timing%24upabase@db.kzerorfeuabowkimywnf.supabase.co:5432/postgres"

# Firebase Admin SDK
FIREBASE_PROJECT_ID="timing-48aba"
FIREBASE_PRIVATE_KEY_ID="aac2e8b4f12ee13a2a2154844da94d79bb79ab19"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----"..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@timing-48aba.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="114328713493572451245"
````

## Development Commands

```bash
npm install          # Install dependencies
npm run dev         # Start development server with nodemon
npm start           # Start production server
npm run init-db     # Initialize database schema
npm run docs        # Show API documentation URL
```

## API Documentation

- **Swagger UI**: Available at `http://localhost:8000/api-docs`
- **Interactive testing**: All endpoints can be tested directly from Swagger UI
- **Schema validation**: Complete request/response schemas documented
- **Authentication**: JWT Bearer token authentication documented

## Current Status

### ✅ Completed Features

- Express server with security middleware
- All API endpoints implemented with validation
- Firebase Admin SDK integration for notifications
- JWT authentication system
- PostgreSQL models and schema
- Real database integration with PostgreSQL
- Error handling and logging
- Menu image URL support with validation

### ✅ Production Ready

- **Database Connection**: Working with Supabase production pooler
- **All endpoints tested and functional**
- **Admin authentication working with JWT**
- **Firebase notifications configured and ready**

### 🔧 Database Connection

- **Working Connection**: `aws-0-ap-southeast-1.pooler.supabase.com:6543`
- **Password**: `Timing$upabase` (URL encoded as `Timing%24upabase`)
- **SSL**: Required with `rejectUnauthorized: false`
- **Admin Credentials**: `username: admin`, `password: admin123`

## Firebase Integration

- Configured for push notifications to admin devices
- Sends notifications when new orders are created
- Supports multiple admin devices via FCM tokens
- Includes order details in notification payload

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
│   └── firebase.js     # Firebase Admin SDK setup
├── middleware/
│   ├── auth.js         # JWT authentication
│   └── validation.js   # Input validation rules
├── models/
│   ├── FcmToken.js     # FCM token operations
│   ├── Menu.js         # Menu item operations with image URL support
│   ├── Order.js        # Order management
│   └── database.sql    # Database schema
├── routes/
│   ├── admin.js        # Admin API endpoints
│   ├── customer.js     # Customer API endpoints
│   └── customer-mock.js # Mock data fallback
├── services/
│   └── notificationService.js # Firebase notifications
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
- Firebase service account key needed for notifications
- JWT_SECRET should be cryptographically secure
- Enable HTTPS in production
- Configure proper CORS origins

## Development Context for Claude
When working on this project:
1. Always test database connectivity before implementing new features
2. Use mock data routes when database is unavailable
3. Validate all inputs and handle errors gracefully
4. Test Firebase notifications with real FCM tokens
5. Maintain consistent JSON response format
6. Follow existing code patterns and conventions
7. Run `npm run dev` to start development server
8. Database schema is in `src/models/database.sql`
```
