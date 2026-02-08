
-- Migration to add IP tracking columns
ALTER TABLE users ADD COLUMN ip_address TEXT;
ALTER TABLE users ADD COLUMN last_login_ip TEXT;
