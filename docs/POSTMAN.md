# Timing API - Postman Collection

This directory contains a comprehensive Postman collection for testing the Timing API endpoints.

## Files Included

- `postman_collection.json` - Complete API collection with all endpoints
- `postman_environment.json` - Environment variables for local development
- `POSTMAN_README.md` - This documentation file

## Quick Setup

### 1. Import Collection
1. Open Postman
2. Click "Import" button
3. Select `postman_collection.json`
4. Click "Import"

### 2. Import Environment
1. Click the gear icon ⚙️ in the top right
2. Click "Import" 
3. Select `postman_environment.json`
4. Click "Import"
5. Select "Timing API Environment" from the environment dropdown

### 3. Start API Server
```bash
npm run dev
```

## Collection Structure

### 🏥 System
- **Health Check** - Test server availability
- **API Documentation** - Access Swagger UI

### 👥 Customer API
- **Get Menu (English/Thai)** - Retrieve menu with proper localization (name, category, description fields are localized based on locale parameter)
- **Get Menu Item by ID** - Get specific menu item details
- **Create Order** - Place a new order
- **Get Order Status** - Check order status

### 👨‍💼 Admin API
- **Admin Login** - Authenticate and get JWT token
- **Get All Orders** - Retrieve orders with filtering
- **Update Order Status** - Change order status
- **Menu Management** - Full CRUD operations
- **Inventory Management**
  - List ingredients and stock
  - Upsert ingredient (name, unit, optional stock)
  - Add stock quantity
  - Delete ingredient by ID
  - Set menu recipe (ingredient quantites per serving)
- **Sales Reports** - Get today's sales data
- LINE notifications are automatic on order creation (no manual test endpoint)

## Authentication Flow

1. **First Time Setup:**
   - Run "Admin Login" request
   - Token will be automatically saved to `{{adminToken}}` variable
   - All subsequent admin requests will use this token

2. **Token Refresh:**
   - If you get 401 errors, re-run the login request
   - Token expires based on JWT configuration

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:8000` |
| `adminToken` | JWT token for admin auth | Auto-populated after login |
| `testOrderId` | Sample order ID for testing | `1` |
| `testMenuId` | Sample menu item ID | `1` |
| `testIngredientId` | Sample ingredient ID for testing | `1` |

## Testing Workflows

### 🧪 Basic API Test
1. Health Check
2. Get Menu (English) - Returns localized `name`, `category`, `description` fields
3. Get Menu (Thai) - Returns Thai localized fields
4. Create Order
5. Get Order Status

### 🛠️ Admin Workflow
1. Admin Login
2. Get All Orders
3. Update Order Status
4. Get Today's Sales
5. Inventory
   - Upsert Ingredient (e.g., milk, ml, stock: 1000)
   - Add Stock (optional)
   - Set Menu Recipe for a menu item
   - Create/Update Order to verify stock deduction/restore

### 📱 Menu Management
1. Admin Login
2. Get Admin Menu
3. Create Menu Item
4. Update Menu Item
5. Delete Menu Item

### 🔔 Notifications
LINE messages are sent automatically after successful order creation to all `line_user_id` in the database.

## Sample Data

### Order Creation
```json
{
  "customer_info": {
    "name": "John Doe",
    "phone": "+66901234567",
    "email": "john@example.com",
    "table_number": "A5"
  },
  "items": [
    {
      "menu_id": 1,
      "quantity": 2,
      "price": 4.50,
      "customizations": {
        "size": "Large",
        "extras": ["Extra shot"]
      }
    }
  ],
  "total": 9.00,
  "notes": "No sugar please"
}
```

### Menu Item Creation
```json
{
  "name_en": "Cappuccino",
  "name_th": "คาปูชิโน่",
  "category_en": "Coffee",
  "category_th": "กาแฟ",
  "base_price": 4.50,
  "description_en": "Rich espresso with steamed milk",
  "description_th": "เอสเพรสโซ่เข้มข้นกับนมที่อุ่น",
  "image_url": "https://example.com/cappuccino.jpg",
  "customizations": {
    "sizes": ["Small", "Medium", "Large"],
    "extras": ["Extra shot", "Decaf", "Soy milk"]
  },
  "active": true
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

## Troubleshooting

### 🔴 Common Issues

**Connection Refused**
- Ensure API server is running (`npm run dev`)
- Check if port 8000 is available
- Verify `baseUrl` in environment

**401 Unauthorized** 
- Run Admin Login request first
- Check if token is saved in environment variables
- Token may have expired - login again

**Database Errors**
- Ensure PostgreSQL is running
- Check database connection in logs
- Verify environment variables are set

**LINE Message Not Received**
- Ensure `LINE_CHANNEL_ACCESS_TOKEN` is set
- Verify your `line_user_id` exists in `line_tokens`
- Confirm the bot can push messages to this user (user must be a friend)

### 📊 Response Validation

Each request includes test scripts that:
- Validate response status codes
- Check response structure
- Save important values to environment variables
- Provide clear error messages

### 🚀 Advanced Usage

**Custom Scripts**
- Pre-request scripts for dynamic data
- Test scripts for response validation
- Environment variable management

**Batch Testing**
- Use Collection Runner for automated testing
- Set up data files for multiple test scenarios
- Export results for reporting

## Files

- `docs/postman_collection.json` — the collection
- `docs/postman_environment.json` — environment variables

## Production Testing

Update the environment `baseUrl` to your production URL:
```
https://your-production-domain.com
```

Ensure you have proper SSL certificates and CORS configuration for production testing.

## Support

For API documentation, visit: `http://localhost:8000/api-docs`

For issues or questions, check the main project README or create an issue in the repository.
