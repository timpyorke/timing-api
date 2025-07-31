# 🍵 Timing API

> **Professional Node.js/Express API for coffee shop order management with real-time Firebase notifications**

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://postgresql.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin%20SDK-orange.svg)](https://firebase.google.com/)
[![Swagger](https://img.shields.io/badge/API%20Docs-Swagger-green.svg)](http://localhost:8000/api-docs)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Overview

The **Timing API** is a production-ready backend service designed for coffee shops and beverage businesses. It provides comprehensive order management, real-time notifications, and admin dashboard functionality with modern security practices.

### ✨ Key Features

- **🔥 Real-time Notifications**: Firebase push messages to admin devices
- **📱 Complete CRUD Operations**: Menu and order management
- **🔐 Secure Authentication**: JWT-based admin authentication
- **📊 Sales Analytics**: Daily revenue and order tracking
- **📚 Interactive Documentation**: Swagger UI with live testing
- **🛡️ Production Security**: Rate limiting, validation, CORS protection

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Admin Panel   │    │  Customer App   │
│   (Firebase)    │    │     (JWT)       │    │   (Public)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │      Timing API             │
                    │   (Node.js/Express)         │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │    PostgreSQL Database      │
                    │      (Supabase)             │
                    └─────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- PostgreSQL database (Supabase recommended)
- Firebase project with Admin SDK

### 1. Installation
```bash
# Clone repository
git clone <your-repository-url>
cd timing-api

# Install dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database (Supabase)
DATABASE_URL="postgresql://postgres:password@host:port/database"

# Authentication
JWT_SECRET="your_secure_jwt_secret_key"

# Firebase Admin SDK
FIREBASE_PROJECT_ID="your_firebase_project_id"
FIREBASE_PRIVATE_KEY_ID="your_private_key_id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@project.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="your_client_id"
```

### 3. Database Setup
```bash
# Initialize database schema and sample data
npm run init-db

# Expected output:
# ✅ Database initialized successfully!
# Tables created: admin_users, beverages, orders, order_items
# Sample data inserted: Admin user and beverages
```

### 4. Firebase Setup
1. **Create Firebase Project**: [Firebase Console](https://console.firebase.google.com/)
2. **Generate Service Account**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download JSON and extract values to `.env`

### 5. Start Development
```bash
# Development server with hot reload
npm run dev

# Production server
npm start

# View API documentation
npm run docs
```

**🎉 Your API is now running at:**
- **API Server**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/api-docs
- **Health Check**: http://localhost:8000/health

## 📚 API Documentation

### 🌐 Interactive Documentation
Access the complete API documentation with live testing at:
**[http://localhost:8000/api-docs](http://localhost:8000/api-docs)**

### 📖 Documentation Files
| File | Description |
|------|-------------|
| **[API_GUIDE.md](API_GUIDE.md)** | Quick start examples with curl commands |
| **[SWAGGER_AUTH_GUIDE.md](SWAGGER_AUTH_GUIDE.md)** | Detailed authentication setup guide |
| **[FCM_TOKEN_SETUP_COMPLETE.md](FCM_TOKEN_SETUP_COMPLETE.md)** | Firebase notification configuration |
| **[NOTIFICATION_TEST_RESULTS.md](NOTIFICATION_TEST_RESULTS.md)** | Testing and validation results |

## 🔐 Authentication

### Default Admin Credentials
```
Username: admin
Password: admin123
```
> ⚠️ **Important**: Change these credentials in production!

### Authentication Flow
1. **Login**: `POST /api/admin/login` with credentials
2. **Get JWT Token**: Extract token from response
3. **Authorize**: Use token in `Authorization: Bearer <token>` header
4. **Access**: All admin endpoints now accessible

### Swagger UI Authentication
1. Click the **"Authorize" 🔒** button in Swagger UI
2. Enter JWT token (without "Bearer " prefix)
3. Click "Authorize" then "Close"
4. Test any protected endpoint

## 🛣️ API Endpoints

### 👥 Customer Endpoints (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/menu` | Get public menu with categories |
| `POST` | `/api/orders` | Create new order (triggers notification) |
| `GET` | `/api/orders/:id/status` | Check order status |

### 🔒 Admin Endpoints (JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Admin authentication |
| `GET` | `/api/admin/orders` | Get all orders with filters |
| `PUT` | `/api/admin/orders/:id/status` | Update order status |
| `GET` | `/api/admin/menu` | Get all menu items (including inactive) |
| `POST` | `/api/admin/menu` | Create new menu item |
| `PUT` | `/api/admin/menu/:id` | Update menu item |
| `DELETE` | `/api/admin/menu/:id` | Delete menu item |
| `GET` | `/api/admin/sales/today` | Get daily sales summary |

### 🛠️ System Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |
| `GET` | `/api-docs` | Interactive API documentation |

## 🗄️ Database Schema

### Core Tables
```sql
admin_users     # Admin authentication and FCM tokens
├── id (PRIMARY KEY)
├── username (UNIQUE)
├── password_hash
├── fcm_token
└── created_at, updated_at

beverages       # Menu items with customizations
├── id (PRIMARY KEY)
├── name, category
├── base_price
├── customizations (JSONB)
├── active (BOOLEAN)
└── created_at, updated_at

orders          # Customer orders
├── id (PRIMARY KEY)
├── customer_info (JSONB)
├── status, total
└── created_at, updated_at

order_items     # Individual items within orders
├── id (PRIMARY KEY)
├── order_id (FOREIGN KEY → orders.id)
├── beverage_id (FOREIGN KEY → beverages.id)
├── customizations (JSONB)
├── quantity, price
└── created_at
```

## 🔔 Firebase Integration

### Notification Features
- **Automatic Triggers**: Every new order sends push notification
- **Multi-device Support**: Notifications to all admin FCM tokens
- **Rich Payload**: Includes order details and customer information
- **Error Handling**: Graceful failure if notifications unavailable

### Notification Payload
```json
{
  "notification": {
    "title": "New Order Received",
    "body": "Order #123 - John Doe - $15.50"
  },
  "data": {
    "type": "new_order",
    "order_id": "123",
    "customer_name": "John Doe",
    "total": "15.50",
    "created_at": "2025-07-29T10:00:00.000Z"
  }
}
```

### FCM Token Management
```bash
# Update admin FCM token
node update-admin-fcm.js

# Check current FCM token status
node check-admin-fcm.js
```

## 📊 API Response Format

All endpoints return consistent JSON responses:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "details": [ ... ]  // For validation errors
}
```

## 🛡️ Security Features

- **🔒 JWT Authentication**: Secure token-based admin access
- **🛡️ Helmet.js**: Security headers and protection
- **🌐 CORS Configuration**: Cross-origin request handling
- **⏱️ Rate Limiting**: 100 requests per 15 minutes per IP
- **✅ Input Validation**: Express-validator for all inputs
- **🔐 Password Hashing**: bcryptjs with salt rounds
- **🔗 SQL Injection Protection**: Parameterized queries

## 🧪 Development & Testing

### Available Scripts
```bash
npm run dev         # Start development server with nodemon
npm start           # Start production server
npm run init-db     # Initialize database schema
npm run docs        # Show API documentation URL
npm test            # Run tests (coming soon)
```

### Testing Tools
```bash
# Test database connection
node check-admin-fcm.js

# Update FCM token
node update-admin-fcm.js

# Health check
curl http://localhost:8000/health
```

## 📈 Production Deployment

### Environment Setup
1. **Set NODE_ENV**: `NODE_ENV=production`
2. **Secure JWT Secret**: Use cryptographically secure random string
3. **Database**: Ensure production PostgreSQL connection
4. **Firebase**: Use production Firebase project
5. **SSL/HTTPS**: Enable HTTPS in production
6. **CORS**: Configure allowed origins

### Performance Considerations
- Enable database connection pooling
- Configure appropriate rate limits
- Set up monitoring and logging
- Implement database backups
- Consider CDN for static assets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check `docs/` folder for detailed guides
- **Issues**: Open an issue on GitHub
- **API Testing**: Use Swagger UI at `/api-docs`

---

<div align="center">

**🍵 Built with ❤️ for coffee lovers everywhere**

[Documentation](http://localhost:8000/api-docs) • [Support](mailto:support@timing-api.com) • [License](LICENSE)

</div>