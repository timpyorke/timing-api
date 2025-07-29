# API Usage Guide

## Swagger Documentation

Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for interactive API documentation.

## Quick Start Examples

### 1. Get Menu
```bash
curl http://localhost:3000/api/menu
```

### 2. Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_info": {
      "name": "John Doe"
    },
    "items": [
      {
        "beverage_id": 1,
        "quantity": 2,
        "price": 3.50,
        "customizations": {
          "size": "Large",
          "extras": ["Extra Shot"]
        }
      }
    ],
    "total": 7.00
  }'
```

### 3. Admin Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 4. Get Orders (Admin)
```bash
# First get token from login, then:
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/admin/orders
```

### 5. Update Order Status (Admin)
```bash
curl -X PUT http://localhost:3000/api/admin/orders/1/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "preparing"}'
```

## Using Swagger UI

1. **Navigate to**: http://localhost:3000/api-docs
2. **Explore endpoints**: Click on any endpoint to see details
3. **Try it out**: Click "Try it out" button on any endpoint
4. **Authentication**: For admin endpoints, click "Authorize" and enter Bearer token
5. **Execute**: Fill in parameters and click "Execute" to test

## Response Format

All API responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ] // For validation errors
}
```

## Authentication

Admin endpoints require JWT Bearer token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get token by calling `/api/admin/login` with valid credentials.