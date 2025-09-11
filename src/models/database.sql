-- Database schema for timing API

-- OneSignal tokens table (separate storage for push notifications)
CREATE TABLE onesignal_tokens (
    id SERIAL PRIMARY KEY,
    player_id TEXT NOT NULL UNIQUE,
    user_id VARCHAR(128),
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LINE tokens table (for LINE messaging notifications)
CREATE TABLE line_tokens (
    id SERIAL PRIMARY KEY,
    line_user_id TEXT NOT NULL UNIQUE,
    user_id VARCHAR(128),
    user_info JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FCM tokens table (kept for backward compatibility during migration)
CREATE TABLE fcm_tokens (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    firebase_uid VARCHAR(128),
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menus table
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    name_th VARCHAR(100),
    name_en VARCHAR(100),
    category_th VARCHAR(50) NOT NULL,
    category_en VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    description_th TEXT,
    description_en TEXT,
    customizations JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(100),
    customer_info JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(100)
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_id INTEGER REFERENCES menus(id),
    customizations JSONB DEFAULT '{}',
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_menus_category ON menus(category);
CREATE INDEX idx_menus_active ON menus(active);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
