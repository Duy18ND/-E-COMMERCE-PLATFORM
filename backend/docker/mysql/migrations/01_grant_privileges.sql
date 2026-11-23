-- Migration 01: Grant Scoped Privileges for Configured Application Database User
-- Safe for VPS deployment (No hardcoded passwords, scoped least privilege, verified user existence)

USE mysql;
DROP PROCEDURE IF EXISTS sp_shopmart_grant_db_scope;
DROP PROCEDURE IF EXISTS sp_shopmart_grant_privileges;
DELIMITER $$

CREATE PROCEDURE sp_shopmart_grant_db_scope(
    IN p_schema  VARCHAR(64),
    IN p_grantee VARCHAR(255)
)
BEGIN
    SET @grant_sql = CONCAT(
        'GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, ',
        'CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON ',
        p_schema, '.* TO ', p_grantee
    );
    PREPARE stmt_grant FROM @grant_sql;
    EXECUTE stmt_grant;
    DEALLOCATE PREPARE stmt_grant;
END$$

CREATE PROCEDURE sp_shopmart_grant_privileges(IN p_user VARCHAR(100))
BEGIN
    DECLARE v_trimmed_user VARCHAR(100) DEFAULT COALESCE(TRIM(p_user), '');
    DECLARE v_host VARCHAR(100);
    DECLARE v_grantee VARCHAR(255);
    DECLARE v_cursor_end BOOLEAN DEFAULT FALSE;
    DECLARE host_cur CURSOR FOR
        SELECT DISTINCT Host FROM mysql.user WHERE User = v_trimmed_user;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_cursor_end = TRUE;

    IF CHAR_LENGTH(v_trimmed_user) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migration aborted: MySQL application user name is empty or not provided (@app_user is null/empty)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM mysql.user WHERE User = v_trimmed_user) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migration aborted: Target MySQL application user does not exist in mysql.user';
    END IF;

    OPEN host_cur;
    host_loop: WHILE NOT v_cursor_end DO
        FETCH host_cur INTO v_host;
        IF NOT v_cursor_end THEN
            -- Scoped least privileges across all 5 ShopMart databases (no global privileges, no GRANT OPTION)
            SET v_grantee = CONCAT(QUOTE(v_trimmed_user), '@', QUOTE(v_host));
            CALL mysql.sp_shopmart_grant_db_scope('auth_db', v_grantee);
            CALL mysql.sp_shopmart_grant_db_scope('product_db', v_grantee);
            CALL mysql.sp_shopmart_grant_db_scope('order_db', v_grantee);
            CALL mysql.sp_shopmart_grant_db_scope('payment_db', v_grantee);
            CALL mysql.sp_shopmart_grant_db_scope('chatbot_db', v_grantee);
        END IF;
    END WHILE host_loop;
    CLOSE host_cur;

    FLUSH PRIVILEGES;
END$$
DELIMITER ;

CALL sp_shopmart_grant_privileges(@app_user);
USE mysql;
DROP PROCEDURE IF EXISTS sp_shopmart_grant_privileges;
DROP PROCEDURE IF EXISTS sp_shopmart_grant_db_scope;
FLUSH PRIVILEGES;
