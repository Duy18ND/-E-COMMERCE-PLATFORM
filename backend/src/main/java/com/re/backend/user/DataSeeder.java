package com.re.backend.user;

import com.re.backend.product.Product;
import com.re.backend.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProductRepository productRepository;

    @Override
    public void run(String... args) throws Exception {
        seedRoles();
        seedUsers();
        seedProducts();
    }

    private void seedRoles() {
        if (roleRepository.findByName("ROLE_USER").isEmpty()) {
            roleRepository.save(Role.builder().name("ROLE_USER").build());
            log.info("[DataSeeder] Created role: ROLE_USER");
        }
        if (roleRepository.findByName("ROLE_ADMIN").isEmpty()) {
            roleRepository.save(Role.builder().name("ROLE_ADMIN").build());
            log.info("[DataSeeder] Created role: ROLE_ADMIN");
        }
    }

    private void seedUsers() {
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("ROLE_ADMIN not found"));
        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("ROLE_USER not found"));

        if (!userRepository.existsByEmail("admin@gmail.com")) {
            User admin = User.builder()
                    .email("admin@gmail.com")
                    .password(passwordEncoder.encode("123456"))
                    .fullName("Administrator")
                    .roles(Set.of(adminRole))
                    .build();
            userRepository.save(admin);
            log.info("[DataSeeder] Created admin user: admin@gmail.com");
        }

        if (!userRepository.existsByEmail("user@gmail.com")) {
            User user = User.builder()
                    .email("user@gmail.com")
                    .password(passwordEncoder.encode("123456"))
                    .fullName("Default User")
                    .roles(Set.of(userRole))
                    .build();
            userRepository.save(user);
            log.info("[DataSeeder] Created sample user: user@gmail.com");
        }
    }

    private void seedProducts() {
        if (productRepository.count() > 0) {
            log.info("[DataSeeder] Products already exist, skipping seed.");
            return;
        }

        List<Product> products = List.of(
                Product.builder()
                        .name("Laptop Dell XPS 15")
                        .price(new BigDecimal("32990000"))
                        .imageUrl("https://picsum.photos/seed/laptop/400/300")
                        .stockQuantity(50)
                        .build(),
                Product.builder()
                        .name("iPhone 15 Pro Max 256GB")
                        .price(new BigDecimal("29990000"))
                        .imageUrl("https://picsum.photos/seed/iphone/400/300")
                        .stockQuantity(100)
                        .build(),
                Product.builder()
                        .name("Tai nghe Sony WH-1000XM5")
                        .price(new BigDecimal("7490000"))
                        .imageUrl("https://picsum.photos/seed/headphone/400/300")
                        .stockQuantity(200)
                        .build()
        );

        productRepository.saveAll(products);
        log.info("[DataSeeder] Created {} sample products.", products.size());
    }
}
