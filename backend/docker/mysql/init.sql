-- ═══════════════════════════════════════════════════════════════
--  E-Commerce Platform — MySQL Initialization Script
--  Creates 4 isolated databases + grants permissions
-- ═══════════════════════════════════════════════════════════════

-- Auth Service database
CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Product Service database
CREATE DATABASE IF NOT EXISTS product_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Order Service database
CREATE DATABASE IF NOT EXISTS order_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Payment Service database
CREATE DATABASE IF NOT EXISTS payment_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Grant full privileges on all 4 databases to the ecommerce_user
GRANT ALL PRIVILEGES ON auth_db.*    TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON product_db.* TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON order_db.*   TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'ecommerce_user'@'%';

FLUSH PRIVILEGES;
