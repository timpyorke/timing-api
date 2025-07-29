-- Database schema for timing API

-- Admin users table
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fcm_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Beverages table
CREATE TABLE beverages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    customizations JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_info JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    beverage_id INTEGER REFERENCES beverages(id),
    customizations JSONB DEFAULT '{}',
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_beverages_category ON beverages(category);
CREATE INDEX idx_beverages_active ON beverages(active);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Insert sample admin user (password: admin123)
INSERT INTO admin_users (username, password_hash) VALUES 
('admin', '$2a$10$X7zS.GxJZ9.yY1A6D/Eg.uKrXxYzQpQk5F.P3M8R4L2N1O6S8T9V0');

-- Insert sample beverages
INSERT INTO beverages (name, category, base_price, customizations) VALUES 
('Espresso', 'Coffee', 3.50, '{"sizes": ["Small", "Medium", "Large"], "extras": ["Extra Shot", "Decaf"]}'),
('Cappuccino', 'Coffee', 4.25, '{"sizes": ["Small", "Medium", "Large"], "milk": ["Regular", "Oat", "Almond", "Soy"]}'),
('Green Tea', 'Tea', 2.75, '{"sizes": ["Small", "Medium", "Large"], "sweetness": ["No Sugar", "Light", "Regular", "Extra Sweet"]}'),
('Iced Latte', 'Coffee', 4.75, '{"sizes": ["Small", "Medium", "Large"], "milk": ["Regular", "Oat", "Almond", "Soy"], "ice": ["Regular Ice", "Light Ice", "No Ice"]}'),
('Fruit Smoothie', 'Smoothies', 5.50, '{"fruits": ["Strawberry", "Mango", "Blueberry", "Mixed Berry"], "sizes": ["Small", "Medium", "Large"]}');