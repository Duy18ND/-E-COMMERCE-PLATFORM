-- Migration 01: Grant Privileges for Production User (ecommerce_prod_user & ecommerce_user)
-- Idempotent & Safe for VPS deployment

CREATE USER IF NOT EXISTS 'ecommerce_user'@'%' IDENTIFIED BY 'ecommerce_pass';
GRANT ALL PRIVILEGES ON auth_db.*    TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON product_db.* TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON order_db.*   TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'ecommerce_user'@'%';

CREATE USER IF NOT EXISTS 'ecommerce_prod_user'@'%' IDENTIFIED BY 'ecommerce_prod_pass';
GRANT ALL PRIVILEGES ON auth_db.*    TO 'ecommerce_prod_user'@'%';
GRANT ALL PRIVILEGES ON product_db.* TO 'ecommerce_prod_user'@'%';
GRANT ALL PRIVILEGES ON order_db.*   TO 'ecommerce_prod_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'ecommerce_prod_user'@'%';

FLUSH PRIVILEGES;
