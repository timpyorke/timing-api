# 🍵 Timing API

> **Professional Node.js/Express API for coffee shop order management with LINE Messaging notifications**

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://postgresql.org/)
[![Swagger](https://img.shields.io/badge/API%20Docs-Swagger-green.svg)](http://localhost:8000/api-docs)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Overview

The **Timing API** is a production-ready backend service designed for coffee shops and food & beverage businesses. It provides comprehensive order management, LINE notifications, and admin dashboard functionality with modern security practices.

### ✨ Key Features

- **🔔 LINE Notifications**: LINE Messaging push to registered user IDs
- **📱 Complete CRUD Operations**: Menu and order management
- **🖼️ Image URL Support**: Menu items with image URLs and validation
- **🔐 Secure Authentication**: JWT-based admin authentication
- **📊 Sales Analytics**: Daily revenue and order tracking
- **📚 Interactive Documentation**: Swagger UI with live testing
- **🛡️ Production Security**: Rate limiting, validation, CORS protection

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LINE Users    │    │   Admin Panel   │    │  Customer App   │
│    (LINE)       │    │     (JWT)       │    │   (Public)      │
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
- PostgreSQL database (e.g., Supabase)

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

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN="your-line-channel-access-token"
LINE_CHANNEL_SECRET="your-line-channel-secret"
```

### 3. Database Setup

```bash
# Initialize database schema and sample data
npm run init-db

# Expected output:
# ✅ Database initialized successfully!
# Tables created: admin_users, menus, orders, order_items
# Sample data inserted: Admin user and menu items
```

### 4. LINE Setup

1. Create a LINE Messaging API channel in LINE Developers Console
2. Get your Channel access token and Channel secret
3. Put them in `.env` as shown above
4. Insert at least one LINE user ID into `line_tokens` table (see below)

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

| File                               | Description                          |
| ---------------------------------- | ------------------------------------ |
| **[LOCALIZATION.md](LOCALIZATION.md)** | Locale and translation guide          |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Deployment instructions              |
| **[POSTMAN_README.md](POSTMAN_README.md)** | Postman collection usage guide        |
| **[INVENTORY.md](docs/INVENTORY.md)** | Inventory module and endpoints       |
| **Postman Collection** | Import `docs/postman_collection.json` with `docs/postman_environment.json` |

## 🔐 Authentication

### Default Admin Credentials

```
Username: admin
Password: admin123
```

> ⚠️ **Important**: Change these credentials in production!

### Authentication Flow

1. **Get JWT Token**: Extract token from response
2. **Authorize**: Use token in `Authorization: Bearer <token>` header
3. **Access**: All admin endpoints now accessible

### Swagger UI Authentication

1. Click the **"Authorize" 🔒** button in Swagger UI
2. Enter JWT token (without "Bearer " prefix)
3. Click "Authorize" then "Close"
4. Test any protected endpoint

## 🛣️ API Endpoints

### 👥 Customer Endpoints (Public)

| Method | Endpoint                 | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| `GET`  | `/api/menu`              | Get public menu with categories          |
| `POST` | `/api/orders`            | Create new order (triggers notification) |
| `GET`  | `/api/orders/:id/status` | Check order status                       |

### 🔒 Admin Endpoints (JWT Required)

| Method   | Endpoint                       | Description                             |
| -------- | ------------------------------ | --------------------------------------- |
| `GET`    | `/api/admin/orders`            | Get all orders with filters             |
| `PUT`    | `/api/admin/orders/:id/status` | Update order status                     |
| `GET`    | `/api/admin/menu`              | Get all menu items (including inactive) |
| `POST`   | `/api/admin/menu`              | Create new menu item                    |
| `PUT`    | `/api/admin/menu/:id`          | Update menu item                        |
| `DELETE` | `/api/admin/menu/:id`          | Delete menu item                        |
| `GET`    | `/api/admin/sales/today`       | Get daily sales summary                 |
| `GET`    | `/api/admin/ingredients`       | List ingredients and stock              |
| `POST`   | `/api/admin/ingredients`       | Upsert ingredient and optional stock    |
| `POST`   | `/api/admin/ingredients/add-stock` | Add stock quantity                   |
| `DELETE` | `/api/admin/ingredients/:id`   | Delete ingredient                       |
| `POST`   | `/api/admin/menu/:id/recipe`   | Set menu recipe                         |

### 🛠️ System Endpoints

| Method | Endpoint    | Description                   |
| ------ | ----------- | ----------------------------- |
| `GET`  | `/health`   | Server health check           |
| `GET`  | `/api-docs` | Interactive API documentation |

## 🗄️ Database Schema

### Core Tables

```sql
menus           # Menu items with customizations and images
├── id (PRIMARY KEY)
├── name, category
├── base_price
├── image_url (TEXT)
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
├── menu_id (FOREIGN KEY → menus.id)
├── customizations (JSONB)
├── quantity, price
└── created_at
```

## 🔔 LINE Messaging Integration

### Notification Behavior

- Sends a LINE text message after successful order creation (customer or admin route)
- Sends to all `line_user_id` values stored in the `line_tokens` table
- Non-blocking, errors are logged and do not affect API responses

### Message Template

```
Order #<id>
At  9 Sep, 12.00PM
---
Item
- 1x Americano
- 3x Matcha latte
---
https://timing-backoffice.vercel.app/orders/<id>
```

### Setup Steps

- Set `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_CHANNEL_SECRET` in `.env`
- Insert recipients into the database:

```sql
INSERT INTO line_tokens (line_user_id) VALUES ('Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
```

Tip: Use the LINE Developers Console or your bot’s logs to capture your real `line_user_id`.

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
# Health check
curl http://localhost:8000/health
```

## 📈 Production Deployment

### Environment Setup

1. **Set NODE_ENV**: `NODE_ENV=production`
2. **Secure JWT Secret**: Use cryptographically secure random string
3. **Database**: Ensure production PostgreSQL connection
5. **SSL/HTTPS**: Enable HTTPS in production
6. **CORS**: Configure allowed origins
7. **LINE**: Use production LINE channel tokens

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
