# Swagger UI Authentication Guide

## How to Use JWT Authorization in Swagger UI

### Step 1: Access Swagger UI
Visit: http://localhost:3000/api-docs

### Step 2: Get JWT Token
1. **Find the Login Endpoint**: Look for `/api/admin/login` under the "Admin" section
2. **Click "Try it out"**
3. **Enter Credentials**:
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
4. **Click "Execute"**
5. **Copy the Token**: From the response, copy the `token` value (without quotes)

### Step 3: Authorize in Swagger UI

**Method 1: Bearer Auth (Recommended)**
1. **Click the "Authorize" button** (lock icon) at the top right
2. **In the "bearerAuth" section**:
   - Paste your JWT token (without "Bearer " prefix)
   - Click "Authorize"
   - Click "Close"

**Method 2: API Key Auth (Alternative)**
1. **Click the "Authorize" button**
2. **In the "ApiKeyAuth" section**:
   - Enter: `Bearer YOUR_TOKEN_HERE`
   - Click "Authorize"
   - Click "Close"

### Step 4: Test Protected Endpoints
Now you can test any admin endpoint:
- `/api/admin/orders` - Get all orders with filters
- `/api/admin/orders/{id}/status` - Update order status
- `/api/admin/menu` - Full menu CRUD operations
- `/api/admin/sales/today` - Daily sales summary

## Example JWT Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3NTM4MDM2OTksImV4cCI6MTc1Mzg5MDA5OX0.DFaEkl-MbasJtG3W26FbtozWVI0fIbDRObA9kov_wCA
```

## Testing Admin Endpoints

### 1. Get All Orders
- **Endpoint**: `GET /api/admin/orders`
- **Authorization**: Required (use token from above)
- **Optional Parameters**:
  - `status`: Filter by order status
  - `date`: Filter by date (YYYY-MM-DD)

### 2. Update Order Status
- **Endpoint**: `PUT /api/admin/orders/{id}/status`
- **Authorization**: Required
- **Request Body**:
  ```json
  {
    "status": "preparing"
  }
  ```
- **Valid Status Values**: pending, preparing, ready, completed, cancelled

### 3. Menu Management
- **Endpoints**:
  - `GET /api/admin/menu` - Get all menu items (including inactive)
  - `POST /api/admin/menu` - Create new menu item
  - `PUT /api/admin/menu/{id}` - Update existing menu item
  - `DELETE /api/admin/menu/{id}` - Delete menu item
- **Authorization**: Required
- **Create/Update Body**:
  ```json
  {
    "name": "Flat White",
    "category": "Coffee",
    "base_price": 4.50,
    "customizations": {
      "sizes": ["Small", "Medium", "Large"],
      "milk": ["Regular", "Oat", "Almond", "Soy"]
    },
    "active": true
  }
  ```

### 4. Daily Sales
- **Endpoint**: `GET /api/admin/sales/today`
- **Authorization**: Required
- **Response**: Daily sales summary with totals and counts

## Authorization Features
- ✅ **Persistent Authorization**: Token stays active across page refreshes
- ✅ **Multiple Auth Methods**: Choose Bearer or API Key format
- ✅ **Visual Indicators**: Locked endpoints show 🔒 when unauthorized
- ✅ **Error Handling**: Clear 401 responses for invalid/expired tokens

## Troubleshooting

**"Authorize button not visible"**
- Refresh the page
- Check that the server is running on port 3000

**"401 Unauthorized" responses**
- Verify token is copied correctly (no extra spaces)
- Check token hasn't expired (24 hour expiry)
- Try getting a fresh token with `/api/admin/login`

**"Token format error"**
- For Bearer Auth: Use token only (no "Bearer " prefix)
- For API Key Auth: Use "Bearer TOKEN_HERE" format