# Timing API

Node.js/Express API for order management system with Firebase push notifications and PostgreSQL database.

## Features

- RESTful API for order management
- Firebase Admin SDK integration for push notifications
- PostgreSQL database via Supabase
- JWT authentication for admin users
- Input validation and error handling
- Rate limiting and security middleware

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. **Database Setup:**
   - Create a PostgreSQL database (Supabase recommended)
   - Run the SQL schema from `src/models/database.sql`
   - Update `DATABASE_URL` in your `.env` file

4. **Firebase Setup:**
   - Create a Firebase project
   - Generate a service account key
   - Add Firebase configuration to your `.env` file

5. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

6. **Access API Documentation:**
   ```bash
   # Visit Swagger UI documentation
   http://localhost:3000/api-docs
   
   # Or run
   npm run docs
   ```

## Authentication in Swagger UI

1. **Get JWT Token**: Use `/api/admin/login` with credentials `admin/admin123`
2. **Authorize**: Click the "Authorize" 🔒 button in Swagger UI
3. **Enter Token**: Paste the JWT token (without "Bearer " prefix)
4. **Test Endpoints**: Try any admin endpoint with authentication

See `SWAGGER_AUTH_GUIDE.md` for detailed instructions.

## API Endpoints

### Customer Endpoints

- `GET /api/menu` - Get public menu with categories
- `POST /api/orders` - Create new order (triggers notification)
- `GET /api/orders/:id/status` - Check order status

### Admin Endpoints (Requires Authentication)

- `POST /api/admin/login` - Admin login
- `GET /api/admin/orders` - Get all orders with optional filters
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/menu` - Get all menu items (including inactive)
- `POST /api/admin/menu` - Create new menu item
- `PUT /api/admin/menu/:id` - Update menu item
- `DELETE /api/admin/menu/:id` - Delete menu item
- `GET /api/admin/sales/today` - Get daily sales summary

## Authentication

Admin endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

- **orders**: Order information and customer details
- **beverages**: Menu items with customizations
- **order_items**: Individual items within orders
- **admin_users**: Admin user accounts with FCM tokens

## Firebase Integration

- Sends push notifications to admin devices when new orders are created
- Supports multiple admin devices via FCM tokens
- Includes order details in notification payload

## Error Handling

All endpoints return consistent JSON responses:
```json
{
  "success": true/false,
  "data": {...},
  "error": "Error message if applicable",
  "message": "Success message if applicable"
}
```

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- JWT token authentication
- Password hashing with bcryptjs