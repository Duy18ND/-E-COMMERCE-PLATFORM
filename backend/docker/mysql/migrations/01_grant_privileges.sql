-- Migration 01: Grant Scoped Privileges for Configured Application Database User
-- Safe for VPS deployment (No hardcoded passwords, scoped least privilege, verified user existence)

USE mysql;
DROP PROCEDURE IF EXISTS sp_shopmart_grant_privileges;
DELIMITER $$
CREATE PROCEDURE sp_shopmart_grant_privileges(IN p_user VARCHAR(100))
BEGIN
    DECLARE v_host VARCHAR(100);
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE done INT DEFAULT 0;
    DECLARE cur CURSOR FOR
        SELECT Host FROM mysql.user WHERE User = p_user;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    IF p_user IS NULL OR TRIM(p_user) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migration aborted: MySQL application user name is empty or not provided (@app_user is null/empty)';
    END IF;

    SELECT COUNT(*) INTO v_user_count FROM mysql.user WHERE User = p_user;
    IF v_user_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migration aborted: Target MySQL application user does not exist in mysql.user';
    END IF;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_host;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        -- Scoped least privileges across all 5 ShopMart databases:
        -- Runtime services require DML (SELECT, INSERT, UPDATE, DELETE), EXECUTE, REFERENCES, INDEX, CREATE TEMPORARY TABLES, LOCK TABLES.
        -- DDL privileges (CREATE, DROP, ALTER) are granted ONLY at database-level for these 5 databases (no global privileges, no GRANT OPTION).
        SET @q1 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON auth_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s1 FROM @q1; EXECUTE s1; DEALLOCATE PREPARE s1;

        SET @q2 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON product_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s2 FROM @q2; EXECUTE s2; DEALLOCATE PREPARE s2;

        SET @q3 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON order_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s3 FROM @q3; EXECUTE s3; DEALLOCATE PREPARE s3;

        SET @q4 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON payment_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s4 FROM @q4; EXECUTE s4; DEALLOCATE PREPARE s4;

        SET @q5 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON chatbot_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s5 FROM @q5; EXECUTE s5; DEALLOCATE PREPARE s5;
    END LOOP;
    CLOSE cur;

    FLUSH PRIVILEGES;
END$$
DELIMITER ;

CALL sp_shopmart_grant_privileges(@app_user);
USE mysql;
DROP PROCEDURE IF EXISTS sp_shopmart_grant_privileges;
FLUSH PRIVILEGES;
