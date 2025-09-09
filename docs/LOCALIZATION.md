# Localization Support

The Timing API supports comprehensive Thai (th) and English (en) localization with both database storage and runtime translation support.

## Features

### Supported Languages
- **English (en)** - Default language
- **Thai (th)** - Full translation support

### Localized Content
- **Database Level**:
  - Menu names and descriptions (stored in both languages)
  - Menu categories (stored in both languages)
  - Order notes (stored in both languages)
  - Customer locale preferences
- **Runtime Level**:
  - Order status messages
  - Error messages  
  - Success messages
  - Push notifications
  - API response messages

## Usage

### Query Parameter
Add `?locale=th` to any API endpoint:
```
GET /api/menu?locale=th
GET /api/orders/123/status?locale=th
```

### Accept-Language Header
Set the `Accept-Language` header:
```
Accept-Language: th-TH,th;q=0.9,en;q=0.8
Accept-Language: en-US,en;q=0.9
```

### Priority Order
1. Query parameter (`?locale=th`)
2. Accept-Language header
3. Default to English (`en`)

## API Response Examples

### Menu with Thai Locale (Database Localization)
```json
{
  "success": true,
  "data": [
    {
      "category": "coffee",
      "category_localized": "กาแฟ",
      "items": [
        {
          "id": 1,
          "name": "Cappuccino",
          "name_localized": "คาปูชิโน่",
          "description": "Rich espresso with steamed milk",
          "description_localized": "เอสเปรสโซ่เข้มข้นผสมนมร้อน",
          "base_price": 4.50,
          "category_localized": "กาแฟ"
        }
      ]
    }
  ]
}
```

### Order Status with Thai Locale (Database Localization)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "preparing",
    "status_localized": "กำลังเตรียม",
    "customer_locale": "th",
    "notes_localized": "ร้อนพิเศษ",
    "created_at": "2025-08-04T04:42:56.425Z",
    "updated_at": "2025-08-04T04:42:56.425Z",
    "total": 4.50,
    "customer_info": { "name": "Test Customer" },
    "items": [
      {
        "id": 1,
        "menu_name": "Cappuccino",
        "menu_name_localized": "คาปูชิโน่",
        "menu_description_localized": "เอสเปรสโซ่เข้มข้นผสมนมร้อน",
        "quantity": 1,
        "price": 4.50
      }
    ]
  }
}
```

### Error Message with Thai Locale
```json
{
  "success": false,
  "error": "ไม่พบคำสั่งซื้อ"
}
```

### Success Message with Thai Locale
```json
{
  "success": true,
  "data": { ... },
  "message": "สร้างคำสั่งซื้อสำเร็จ"
}
```

## Translation Keys

### Order Status
- `pending` → "รอดำเนินการ" (Pending)
- `preparing` → "กำลังเตรียม" (Preparing)
- `ready` → "พร้อมรับ" (Ready)
- `completed` → "เสร็จสิ้น" (Completed)
- `cancelled` → "ยกเลิก" (Cancelled)

### Menu Categories
- `coffee` → "กาแฟ" (Coffee)
- `tea` → "ชา" (Tea)
- `dessert` → "ของหวาน" (Dessert)
- `snack` → "ขนม" (Snack)
- `drink` → "เครื่องดื่ม" (Drink)

### Common Messages
- "Order not found" → "ไม่พบคำสั่งซื้อ"
- "Menu item not found" → "ไม่พบรายการเมนู"
- "Order created successfully" → "สร้างคำสั่งซื้อสำเร็จ"
- "Internal server error" → "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์"

## Notifications

Notifications (including LINE messages) are localized based on the request locale:

### English
- Title: "New Order"
- Body: "Order #123 from John Doe"

### Thai
- Title: "คำสั่งซื้อใหม่"
- Body: "คำสั่งซื้อ #123 จาก John Doe"

## Database Schema

### Menu Table Localization
```sql
-- Added fields for localization
ALTER TABLE menus ADD COLUMN name_th VARCHAR(100);
ALTER TABLE menus ADD COLUMN description TEXT;
ALTER TABLE menus ADD COLUMN description_th TEXT;
ALTER TABLE menus ADD COLUMN category_th VARCHAR(50);
CREATE INDEX idx_menus_category_th ON menus(category_th);
```

### Orders Table Localization
```sql
-- Added fields for localization
ALTER TABLE orders ADD COLUMN customer_locale VARCHAR(5) DEFAULT 'en' CHECK (customer_locale IN ('en', 'th'));
ALTER TABLE orders ADD COLUMN notes TEXT;
ALTER TABLE orders ADD COLUMN notes_th TEXT;
CREATE INDEX idx_orders_customer_locale ON orders(customer_locale);
CREATE INDEX idx_orders_status_locale ON orders(status, customer_locale);
```

## Database Migrations

Run the localization migrations:
```bash
# Run all migrations
node scripts/run-migrations.js up

# Run specific migrations
node migrations/002_add_menu_localization.js up
node migrations/003_add_order_localization.js up

# Rollback migrations if needed
node scripts/run-migrations.js down
```

## Implementation Details

### File Structure
```
src/
├── locales/
│   ├── en.json          # English translations
│   └── th.json          # Thai translations
├── middleware/
│   └── locale.js        # Locale detection middleware
├── models/
│   ├── Menu.js          # Enhanced with localization support
│   └── Order.js         # Enhanced with localization support
├── utils/
│   └── localization.js  # Translation utility
└── migrations/
    ├── 002_add_menu_localization.js
    └── 003_add_order_localization.js
```

### Adding New Languages

1. Create new locale file: `src/locales/{locale}.json`
2. Add locale to `supportedLocales` in `src/utils/localization.js`
3. Translations will be automatically available

### Adding New Translation Keys

1. Add keys to both `en.json` and `th.json`
2. Use dot notation for nested keys (e.g., `"menu.categories.coffee"`)
3. Support parameter interpolation with `{parameter_name}` syntax

### Creating Localized Menu Items

When creating menu items via API, include both English and Thai fields:

```json
POST /api/admin/menu
{
  "name": "Cappuccino",
  "name_th": "คาปูชิโน่",
  "description": "Rich espresso with steamed milk and thick foam",
  "description_th": "เอสเปรสโซ่เข้มข้นผสมนมร้อนและฟองนมหนา",
  "category": "coffee",
  "category_th": "กาแฟ",
  "base_price": 4.50,
  "image_url": "https://example.com/cappuccino.jpg",
  "customizations": {
    "sizes": ["Small", "Medium", "Large"],
    "extras": ["Extra Shot", "Decaf", "Oat Milk"]
  },
  "active": true
}
```

**Field Requirements:**
- `name`, `category`, `base_price` - Required
- `name_th`, `description`, `description_th`, `category_th` - Optional
- `image_url`, `customizations`, `active` - Optional

**Menu API Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "category": "coffee",
      "category_localized": "กาแฟ",
      "items": [
        {
          "id": 1,
          "name": "Cappuccino",
          "name_localized": "คาปูชิโน่",
          "description": "Rich espresso with steamed milk and thick foam",
          "description_localized": "เอสเปรสโซ่เข้มข้นผสมนมร้อนและฟองนมหนา",
          "category_localized": "กาแฟ",
          "base_price": 4.50,
          "image_url": "https://example.com/cappuccino.jpg",
          "customizations": {
            "sizes": ["Small", "Medium", "Large"]
          }
        }
      ]
    }
  ]
}
```

### Creating Localized Orders

Orders automatically store customer locale and support localized notes:

```json
POST /api/orders
{
  "customer_info": { "name": "John Doe" },
  "items": [...],
  "total": 4.50,
  "notes": "Extra hot",
  "notes_th": "ร้อนพิเศษ"
}
```

The API will automatically detect and store the customer's locale based on:
1. `?locale=th` query parameter
2. `Accept-Language: th-TH` header
3. Default to `en`

## Content-Language Header

The API automatically sets the `Content-Language` header in responses to indicate the language used:

```
Content-Language: th
Content-Language: en
```

## Testing

Run the localization tests:
```bash
node test-localization.js
node test-api-localization.js
```

Both tests verify:
- Translation accuracy
- Locale detection
- API response formatting
- Parameter interpolation
