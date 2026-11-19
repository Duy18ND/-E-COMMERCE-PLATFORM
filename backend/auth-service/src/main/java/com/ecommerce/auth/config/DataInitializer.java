package com.ecommerce.auth.config;

import com.ecommerce.auth.entity.Role;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.enums.RoleName;
import com.ecommerce.auth.repository.RoleRepository;
import com.ecommerce.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Value("${DEFAULT_ADMIN_EMAIL:}")
    private String defaultAdminEmail = "";

    @Value("${DEFAULT_ADMIN_PASSWORD:}")
    private String defaultAdminPassword = "";

    @Override
    public void run(String... args) {
        initRoles();
        initDefaultAdmin();
    }

    private void initRoles() {
        for (RoleName roleName : RoleName.values()) {
            if (!roleRepository.existsByName(roleName)) {
                Role role = Role.builder().name(roleName).build();
                roleRepository.save(role);
                log.info("Initialized role: {}", roleName);
            }
        }
    }

    private static final int MIN_PROD_ADMIN_PASSWORD_LENGTH = 12;
    private static final Set<String> FORBIDDEN_DEFAULT_PASSWORDS = Set.of(
            "admin@123456",
            "admin@123",
            "admin123",
            "admin123456",
            "password",
            "password123",
            "password@123",
            "123456789012",
            "ecommerce",
            "shopmart"
    );

    private void initDefaultAdmin() {
        boolean isProd = environment != null && environment.acceptsProfiles(Profiles.of("prod"));
        boolean hasEmail = defaultAdminEmail != null && !defaultAdminEmail.isBlank();
        boolean hasPassword = defaultAdminPassword != null && !defaultAdminPassword.isBlank();

        if (isProd) {
            if (!isValidProdAdminEmail(defaultAdminEmail) || !isStrongProdAdminPassword(defaultAdminPassword)) {
                if (userRepository.count() == 0) {
                    throw new IllegalStateException(
                            "DEFAULT_ADMIN_EMAIL and a strong DEFAULT_ADMIN_PASSWORD (min 12 chars, upper, lower, digit, special char, non-default/non-placeholder) must be configured when initializing an empty production database.");
                }
                log.info("Skipping default admin seed in prod profile: users already exist and valid admin credentials are not configured.");
                return;
            }
        }

        String adminEmail = hasEmail ? defaultAdminEmail.trim() : "admin@ecommerce.com";
        String adminPass = hasPassword ? defaultAdminPassword : "Admin@123456";

        if (!userRepository.existsByEmail(adminEmail)) {
            Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                    .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_ADMIN)));
            Role userRole = roleRepository.findByName(RoleName.ROLE_USER)
                    .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_USER)));

            User admin = User.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPass))
                    .fullName("System Administrator")
                    .phone("0900000000")
                    .roles(Set.of(adminRole, userRole))
                    .build();
            userRepository.save(admin);
            log.info("Initialized default system admin account: {}", adminEmail);
        }
    }

    private boolean isValidProdAdminEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        String trimmed = email.trim();
        int atIndex = trimmed.indexOf('@');
        if (atIndex <= 0 || atIndex >= trimmed.length() - 1 || trimmed.chars().anyMatch(Character::isWhitespace)) {
            return false;
        }
        String upper = trimmed.toUpperCase(Locale.ROOT);
        return !upper.contains("CHANGE_ME")
                && !upper.contains("CHANGEME")
                && !upper.contains("PLACEHOLDER");
    }

    private boolean isStrongProdAdminPassword(String password) {
        if (password == null || password.isBlank() || password.length() < MIN_PROD_ADMIN_PASSWORD_LENGTH) {
            return false;
        }
        if (password.chars().anyMatch(Character::isWhitespace)) {
            return false;
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (FORBIDDEN_DEFAULT_PASSWORDS.contains(lower)) {
            return false;
        }
        String upper = password.toUpperCase(Locale.ROOT);
        if (upper.contains("CHANGE_ME")
                || upper.contains("CHANGEME")
                || upper.contains("PLACEHOLDER")
                || upper.contains("YOUR_PASSWORD")
                || upper.contains("DEFAULT_ADMIN")) {
            return false;
        }

        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            if (Character.isUpperCase(c)) {
                hasUpper = true;
            } else if (Character.isLowerCase(c)) {
                hasLower = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            } else {
                hasSpecial = true;
            }
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}
