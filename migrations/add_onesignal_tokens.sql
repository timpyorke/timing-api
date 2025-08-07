-- Migration: Add OneSignal tokens table
-- Run this to migrate from Firebase FCM to OneSignal

-- Create OneSignal tokens table
CREATE TABLE IF NOT EXISTS onesignal_tokens (
    id SERIAL PRIMARY KEY,
    player_id TEXT NOT NULL UNIQUE,
    user_id VARCHAR(128),
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_onesignal_tokens_player_id ON onesignal_tokens(player_id);
CREATE INDEX IF NOT EXISTS idx_onesignal_tokens_user_id ON onesignal_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_onesignal_tokens_updated_at ON onesignal_tokens(updated_at);

-- Note: FCM tokens table is kept for backward compatibility
-- You can drop it after fully migrating to OneSignal:
-- DROP TABLE fcm_tokens;