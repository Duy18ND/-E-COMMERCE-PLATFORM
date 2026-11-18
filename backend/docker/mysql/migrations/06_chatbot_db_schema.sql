-- Migration 06: chatbot_db schema initialization for AI Shopping Assistant
-- Creates chatbot_db, permissions and tables for conversation memory

CREATE DATABASE IF NOT EXISTS chatbot_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON chatbot_db.* TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON chatbot_db.* TO 'ecommerce_prod_user'@'%';
FLUSH PRIVILEGES;

USE chatbot_db;

CREATE TABLE IF NOT EXISTS chat_conversations (
    id               VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'UUID phiên hội thoại',
    user_id          BIGINT       NULL     COMMENT 'ID người dùng đã đăng nhập (NULL nếu là khách vãng lai)',
    guest_session_id VARCHAR(64)  NULL     COMMENT 'Mã phiên hội thoại của khách vãng lai',
    title            VARCHAR(200) NOT NULL DEFAULT 'Cuộc trò chuyện mới' COMMENT 'Tiêu đề cuộc hội thoại',
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, ARCHIVED, DELETED',
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_chat_conv_user_updated (user_id, status, updated_at),
    INDEX idx_chat_conv_guest (guest_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng lưu phiên hội thoại Trợ lý Mua sắm AI';

CREATE TABLE IF NOT EXISTS chat_messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL COMMENT 'ID phiên hội thoại liên kết',
    role            VARCHAR(20) NOT NULL COMMENT 'USER, ASSISTANT, SYSTEM, TOOL',
    content         TEXT        NOT NULL COMMENT 'Nội dung tin nhắn',
    metadata_json   TEXT        NULL     COMMENT 'Dữ liệu JSON sản phẩm gợi ý / đơn hàng tra cứu',
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_chat_msg_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    INDEX idx_chat_msg_conv_created (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng lưu lịch sử tin nhắn trong từng hội thoại AI';

