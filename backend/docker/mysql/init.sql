-- ═══════════════════════════════════════════════════════════════
--  E-Commerce Platform — MySQL Complete Initialization Script
--  Creates 4 isolated databases + sets full privileges + schemas
--  Safe for initial setup and idempotent (IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  1. Create 4 isolated databases
-- ─────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS product_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS order_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS payment_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
--  2. User Privileges (Dev: ecommerce_user & Prod: ecommerce_prod_user)
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
--  3. Auth Service Database (auth_db)
-- ─────────────────────────────────────────────────────────────
USE auth_db;

CREATE TABLE IF NOT EXISTS roles (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE COMMENT 'Tên vai trò (ROLE_USER, ROLE_ADMIN)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng vai trò người dùng';

INSERT IGNORE INTO roles (id, name) VALUES (1, 'ROLE_USER'), (2, 'ROLE_ADMIN');

CREATE TABLE IF NOT EXISTS users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(120) NOT NULL UNIQUE COMMENT 'Email đăng nhập duy nhất',
    password   VARCHAR(255) NOT NULL        COMMENT 'Mật khẩu băm BCrypt',
    full_name  VARCHAR(150) NOT NULL        COMMENT 'Họ và tên người dùng',
    phone      VARCHAR(20)                  COMMENT 'Số điện thoại',
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' COMMENT 'Trạng thái: ACTIVE, BLOCKED',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng tài khoản người dùng';

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết người dùng và vai trò';

CREATE TABLE IF NOT EXISTS user_addresses (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL COMMENT 'ID người dùng',
    receiver_name VARCHAR(150) NOT NULL COMMENT 'Tên người nhận hàng',
    phone         VARCHAR(20)  NOT NULL COMMENT 'Số điện thoại người nhận',
    address_line  VARCHAR(255) NOT NULL COMMENT 'Địa chỉ chi tiết (số nhà, tên đường)',
    city          VARCHAR(100) NOT NULL COMMENT 'Tỉnh/Thành phố',
    district      VARCHAR(100)          COMMENT 'Quận/Huyện',
    ward          VARCHAR(100)          COMMENT 'Phường/Xã',
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Địa chỉ mặc định',
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_address_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sổ địa chỉ nhận hàng của người dùng';

-- ─────────────────────────────────────────────────────────────
--  4. Product Service Database (product_db)
-- ─────────────────────────────────────────────────────────────
USE product_db;

CREATE TABLE IF NOT EXISTS categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE COMMENT 'Tên danh mục sản phẩm',
    description VARCHAR(255)                 COMMENT 'Mô tả danh mục',
    image_url   VARCHAR(500)                 COMMENT 'Đường dẫn ảnh danh mục',
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục phân loại sản phẩm';

CREATE TABLE IF NOT EXISTS products (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(200)   NOT NULL COMMENT 'Tên sản phẩm',
    description    TEXT                    COMMENT 'Mô tả chi tiết sản phẩm',
    price          DECIMAL(12, 2) NOT NULL COMMENT 'Giá bán sản phẩm',
    stock_quantity INT            NOT NULL COMMENT 'Số lượng tồn kho hiện tại (không âm)',
    category       VARCHAR(100)            COMMENT 'Tên danh mục sản phẩm',
    image_url      VARCHAR(500)            COMMENT 'Đường dẫn ảnh sản phẩm',
    status         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' COMMENT 'Trạng thái: ACTIVE, INACTIVE, OUT_OF_STOCK',
    version        BIGINT         NOT NULL DEFAULT 0 COMMENT 'Optimistic Locking version chống race condition',
    created_at     DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_products_stock_non_negative CHECK (stock_quantity >= 0),
    INDEX idx_products_name (name),
    INDEX idx_products_category (category),
    INDEX idx_products_status (status),
    INDEX idx_products_status_price (status, price),
    INDEX idx_products_status_category (status, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục sản phẩm và quản lý tồn kho';

CREATE TABLE IF NOT EXISTS product_reviews (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id    BIGINT       NOT NULL COMMENT 'ID sản phẩm được đánh giá',
    user_id       BIGINT       NOT NULL COMMENT 'ID người dùng viết đánh giá',
    order_id      BIGINT       NOT NULL COMMENT 'ID đơn hàng DELIVERED — xác minh điều kiện đánh giá',
    rating        INT          NOT NULL COMMENT 'Điểm đánh giá từ 1 đến 5 (Khớp Hibernate Integer)',
    comment       TEXT                  COMMENT 'Nội dung bình luận (tuỳ chọn)',
    status        VARCHAR(20)  NOT NULL DEFAULT 'APPROVED' COMMENT 'Trạng thái kiểm duyệt: APPROVED, HIDDEN',
    hidden_reason VARCHAR(255)          COMMENT 'Lý do ẩn đánh giá vi phạm',
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT uq_review_product_user UNIQUE (product_id, user_id),
    INDEX idx_reviews_product_id (product_id),
    INDEX idx_reviews_user_id (user_id),
    INDEX idx_reviews_product_status (product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Đánh giá sản phẩm từ khách hàng đã mua hàng';

CREATE TABLE IF NOT EXISTS flash_sale_campaigns (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(200) NOT NULL COMMENT 'Tên chiến dịch Flash Sale',
    start_time DATETIME(6)  NOT NULL COMMENT 'Thời điểm bắt đầu',
    end_time   DATETIME(6)  NOT NULL COMMENT 'Thời điểm kết thúc',
    status     VARCHAR(20)  NOT NULL DEFAULT 'UPCOMING' COMMENT 'UPCOMING, ACTIVE, ENDED, CANCELLED',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_fs_status_time (status, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chương trình chiến dịch Flash Sale';

CREATE TABLE IF NOT EXISTS flash_sale_items (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    campaign_id      BIGINT         NOT NULL COMMENT 'ID chiến dịch Flash Sale',
    product_id       BIGINT         NOT NULL COMMENT 'ID sản phẩm tham gia Flash Sale',
    flash_sale_price DECIMAL(12, 2) NOT NULL COMMENT 'Giá ưu đãi trong Flash Sale',
    quantity         INT            NOT NULL COMMENT 'Số lượng phân bổ cho Flash Sale',
    sold_quantity    INT            NOT NULL DEFAULT 0 COMMENT 'Số lượng đã bán',
    user_limit       INT            NOT NULL DEFAULT 2 COMMENT 'Số lượng tối đa 1 khách được mua',
    CONSTRAINT fk_fs_campaign FOREIGN KEY (campaign_id) REFERENCES flash_sale_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_fs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_fs_campaign_product UNIQUE (campaign_id, product_id),
    CONSTRAINT chk_fs_price CHECK (flash_sale_price > 0),
    CONSTRAINT chk_fs_quantity CHECK (quantity > 0 AND sold_quantity >= 0 AND sold_quantity <= quantity),
    INDEX idx_fs_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chi tiết sản phẩm và hạn mức trong chiến dịch Flash Sale';

-- ─────────────────────────────────────────────────────────────
--  5. Order Service Database (order_db)
-- ─────────────────────────────────────────────────────────────
USE order_db;

CREATE TABLE IF NOT EXISTS vouchers (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(50)    NOT NULL COMMENT 'Mã voucher (duy nhất, không phân biệt hoa thường)',
    name            VARCHAR(150)   NOT NULL COMMENT 'Tên chương trình khuyến mãi',
    description     VARCHAR(500)            COMMENT 'Mô tả chi tiết voucher',
    discount_type   VARCHAR(20)    NOT NULL COMMENT 'Loại giảm giá: FIXED (tiền cố định), PERCENT (%)',
    discount_value  DECIMAL(12, 2) NOT NULL COMMENT 'Giá trị giảm (VNĐ hoặc %)',
    max_discount    DECIMAL(12, 2)          COMMENT 'Mức giảm tối đa áp dụng cho PERCENT',
    min_order_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Giá trị đơn hàng tối thiểu để áp dụng mã',
    quantity        INT            NOT NULL COMMENT 'Tổng số lượt phát hành',
    used_quantity   INT            NOT NULL DEFAULT 0 COMMENT 'Số lượt đã sử dụng',
    start_date      DATE           NOT NULL COMMENT 'Ngày bắt đầu áp dụng',
    end_date        DATE           NOT NULL COMMENT 'Ngày kết thúc áp dụng',
    status          VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' COMMENT 'Trạng thái: ACTIVE, INACTIVE',
    created_at      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_voucher_code UNIQUE (code),
    CONSTRAINT chk_vouchers_discount_value CHECK (discount_value > 0),
    CONSTRAINT chk_vouchers_quantity CHECK (quantity > 0 AND used_quantity >= 0 AND used_quantity <= quantity),
    CONSTRAINT chk_vouchers_dates CHECK (end_date >= start_date),
    INDEX idx_vouchers_code (code),
    INDEX idx_vouchers_status_dates (status, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng mã giảm giá voucher cho đơn hàng';

INSERT IGNORE INTO vouchers (id, code, name, description, discount_type, discount_value, max_discount, min_order_value, quantity, used_quantity, start_date, end_date, status) VALUES
(1, 'GIAM20K',    'Giảm 20K đơn đầu ngày',           'Giảm 20.000đ cho đơn hàng từ 200.000đ',                  'FIXED',   20000.00,  NULL,      200000.00,  500,  0, '2026-01-01', '2027-12-31', 'ACTIVE'),
(2, 'GIAM50K',    'Ưu đãi mua sắm 50K',              'Giảm 50.000đ cho đơn hàng từ 500.000đ',                  'FIXED',   50000.00,  NULL,      500000.00,  300,  0, '2026-01-01', '2027-12-31', 'ACTIVE'),
(3, 'SALE10',     'Siêu sale công nghệ 10%',         'Giảm 10% tối đa 100.000đ cho đơn từ 300.000đ',           'PERCENT', 10.00,     100000.00, 300000.00,  1000, 0, '2026-01-01', '2027-12-31', 'ACTIVE'),
(4, 'TECHVIP',    'Đặc quyền Tech VIP 15%',          'Giảm 15% tối đa 300.000đ cho đơn từ 1.000.000đ',         'PERCENT', 15.00,     300000.00, 1000000.00, 250,  0, '2026-01-01', '2027-12-31', 'ACTIVE'),
(5, 'FREESHIP',   'Miễn phí vận chuyển toàn quốc',   'Giảm 30.000đ phí giao hàng cho đơn từ 150.000đ',         'FIXED',   30000.00,  NULL,      150000.00,  1500, 0, '2026-01-01', '2027-12-31', 'ACTIVE'),
(6, 'WELCOME100', 'Chào mừng thành viên mới',        'Giảm ngay 100.000đ cho đơn hàng đầu tiên từ 800.000đ',   'FIXED',   100000.00, NULL,      800000.00,  400,  0, '2026-01-01', '2027-12-31', 'ACTIVE'),
(7, 'WELCOME50',  'Voucher chào mừng 50K',           'Giảm 50.000đ cho đơn hàng từ 200.000đ',                  'FIXED',   50000.00,  NULL,      200000.00,  500,  0, '2026-01-01', '2027-12-31', 'ACTIVE'),
(8, 'VIP20',      'Ưu đãi thành viên VIP 20%',       'Giảm 20% tối đa 200.000đ cho đơn từ 500.000đ',           'PERCENT', 20.00,     200000.00, 500000.00,  300,  0, '2026-01-01', '2027-12-31', 'ACTIVE');

-- [Task ECOM-166 / ECOM-167 / ECOM-183] Bảng lưu lịch sử sử dụng voucher của từng người dùng theo đơn hàng
-- Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
CREATE TABLE IF NOT EXISTS voucher_usages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    voucher_id      BIGINT         NOT NULL COMMENT 'ID voucher liên kết',
    voucher_code    VARCHAR(50)    NOT NULL COMMENT 'Mã voucher tại thời điểm áp dụng',
    user_id         BIGINT         NOT NULL COMMENT 'ID người dùng sử dụng voucher',
    order_id        BIGINT                  COMMENT 'ID đơn hàng áp dụng voucher',
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Số tiền được giảm từ voucher',
    status          VARCHAR(20)    NOT NULL DEFAULT 'APPLIED' COMMENT 'Trạng thái lượt dùng: APPLIED (đang áp dụng), RESTORED (đã hoàn lượt khi hủy đơn/lỗi thanh toán)',
    used_at         DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT 'Thời điểm sử dụng mã',
    updated_at      DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_voucher_usage_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
    INDEX idx_voucher_usage_voucher_user (voucher_id, user_id, status),
    INDEX idx_voucher_usage_code_user (voucher_code, user_id, status),
    INDEX idx_voucher_usage_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng lịch sử sử dụng voucher của người dùng (chặn dùng trùng và hoàn lượt khi hủy đơn)';

CREATE TABLE IF NOT EXISTS orders (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT         NOT NULL COMMENT 'ID người dùng đặt hàng',
    receiver_name    VARCHAR(100)   NOT NULL COMMENT 'Tên người nhận',
    receiver_phone   VARCHAR(20)    NOT NULL COMMENT 'Số điện thoại người nhận',
    shipping_address TEXT           NOT NULL COMMENT 'Địa chỉ nhận hàng chi tiết',
    subtotal_amount  DECIMAL(12, 2)          COMMENT 'Tổng tiền hàng trước giảm giá',
    voucher_code     VARCHAR(50)             COMMENT 'Mã voucher áp dụng',
    discount_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Số tiền giảm giá',
    total_amount     DECIMAL(12, 2) NOT NULL COMMENT 'Tổng số tiền thanh toán thực tế',
    status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING' COMMENT 'Trạng thái đơn hàng: PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, REFUNDED',
    payment_method   VARCHAR(30)    NOT NULL COMMENT 'Phương thức thanh toán: COD, MOCK_ONLINE, VNPAY',
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng quản lý đơn hàng';

CREATE TABLE IF NOT EXISTS order_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id          BIGINT         NOT NULL COMMENT 'ID đơn hàng liên kết',
    product_id        BIGINT         NOT NULL COMMENT 'ID sản phẩm đã mua',
    product_name      VARCHAR(255)   NOT NULL COMMENT 'Tên sản phẩm tại thời điểm mua',
    quantity          INT            NOT NULL COMMENT 'Số lượng mua',
    price_at_purchase DECIMAL(12, 2) NOT NULL COMMENT 'Giá bán tại thời điểm đặt hàng',
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_item_order_id (order_id),
    INDEX idx_order_item_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng chi tiết các mặt hàng trong đơn hàng';

CREATE TABLE IF NOT EXISTS order_status_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT       NOT NULL COMMENT 'ID đơn hàng liên kết',
    status          VARCHAR(30)  NOT NULL COMMENT 'Trạng thái mới cập nhật',
    previous_status VARCHAR(30)           COMMENT 'Trạng thái trước khi cập nhật',
    action          VARCHAR(50)           COMMENT 'Hành động kích hoạt (ORDER_CREATED, STATUS_UPDATED, ...)',
    updated_by      VARCHAR(100)          COMMENT 'Người thực hiện cập nhật',
    actor_role      VARCHAR(50)           COMMENT 'Vai trò người cập nhật (ROLE_CUSTOMER, ROLE_ADMIN, SYSTEM)',
    note            TEXT                  COMMENT 'Ghi chú cập nhật trạng thái',
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_status_history_order_id (order_id),
    INDEX idx_status_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký lịch sử thay đổi trạng thái đơn hàng (Timeline)';

CREATE TABLE IF NOT EXISTS carts (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT      NOT NULL UNIQUE COMMENT 'ID người dùng sở hữu giỏ hàng',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)          DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_carts_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng giỏ hàng của người dùng';

CREATE TABLE IF NOT EXISTS cart_items (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    cart_id    BIGINT      NOT NULL COMMENT 'ID giỏ hàng',
    product_id BIGINT      NOT NULL COMMENT 'ID sản phẩm trong giỏ',
    quantity   INT         NOT NULL COMMENT 'Số lượng sản phẩm',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)          DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT uk_cart_item_cart_product UNIQUE (cart_id, product_id),
    INDEX idx_cart_items_cart_id (cart_id),
    INDEX idx_cart_items_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng chi tiết các sản phẩm trong giỏ hàng';

-- ─────────────────────────────────────────────────────────────
--  6. Payment Service Database (payment_db)
-- ─────────────────────────────────────────────────────────────
USE payment_db;

CREATE TABLE IF NOT EXISTS payments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id         BIGINT         NOT NULL COMMENT 'ID đơn hàng liên kết',
    amount           DECIMAL(15, 2) NOT NULL COMMENT 'Số tiền thanh toán',
    payment_method   VARCHAR(50)    NOT NULL COMMENT 'Phương thức: COD, MOCK_ONLINE, VNPAY',
    status           VARCHAR(20)    NOT NULL COMMENT 'Trạng thái thanh toán: PENDING, SUCCESS, FAILED',
    transaction_code VARCHAR(100)            COMMENT 'Mã giao dịch đối soát duy nhất',
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_payment_order_id (order_id),
    INDEX idx_payment_transaction_code (transaction_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng lịch sử giao dịch thanh toán';
