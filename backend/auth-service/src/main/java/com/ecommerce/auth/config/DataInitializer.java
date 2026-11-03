package com.ecommerce.auth.config;

import com.ecommerce.auth.entity.Role;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.enums.RoleName;
import com.ecommerce.auth.repository.RoleRepository;
import com.ecommerce.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

    private void initDefaultAdmin() {
        String adminEmail = "admin@ecommerce.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                    .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_ADMIN)));
            Role userRole = roleRepository.findByName(RoleName.ROLE_USER)
                    .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_USER)));

            User admin = User.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode("Admin@123456"))
                    .fullName("System Administrator")
                    .phone("0900000000")
                    .roles(Set.of(adminRole, userRole))
                    .build();
            userRepository.save(admin);
            log.info("Initialized default system admin account: {}", adminEmail);
        }
    }
}
