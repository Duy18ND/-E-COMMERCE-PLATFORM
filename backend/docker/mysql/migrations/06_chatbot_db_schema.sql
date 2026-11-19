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
    id               VARCHAR(36)  NOT NULL,
    user_id          BIGINT       DEFAULT NULL,
    guest_session_id VARCHAR(64)  DEFAULT NULL,
    title            VARCHAR(200) NOT NULL DEFAULT 'Cuộc trò chuyện mới',
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_chat_conv_user_updated (user_id, status, updated_at),
    KEY idx_chat_conv_guest (guest_session_id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    conversation_id VARCHAR(36) NOT NULL,
    role            VARCHAR(20) NOT NULL,
    content         TEXT        NOT NULL,
    metadata_json   TEXT        DEFAULT NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_chat_msg_conv_created (conversation_id, created_at),
    CONSTRAINT fk_chat_msg_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


