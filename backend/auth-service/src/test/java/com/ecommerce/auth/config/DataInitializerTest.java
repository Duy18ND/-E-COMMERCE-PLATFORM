package com.ecommerce.auth.config;

import com.ecommerce.auth.entity.Role;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.enums.RoleName;
import com.ecommerce.auth.repository.RoleRepository;
import com.ecommerce.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private MockEnvironment environment;
    private DataInitializer dataInitializer;

    @BeforeEach
    void setUp() {
        environment = new MockEnvironment();
        dataInitializer = new DataInitializer(roleRepository, userRepository, passwordEncoder, environment);
        lenient().when(roleRepository.existsByName(any(RoleName.class))).thenReturn(true);
        lenient().when(roleRepository.findByName(any(RoleName.class)))
                .thenAnswer(inv -> Optional.of(new Role(inv.getArgument(0))));
        lenient().when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded-password");
    }

    @Test
    void prodEmptyDbRejectsMissingAdminCredentialsAndDoesNotLeakSecret() {
        environment.setActiveProfiles("prod");
        when(userRepository.count()).thenReturn(0L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> dataInitializer.run());
        assertTrue(ex.getMessage().contains("DEFAULT_ADMIN_EMAIL"));
        assertTrue(ex.getMessage().contains("DEFAULT_ADMIN_PASSWORD"));
        verify(roleRepository, times(RoleName.values().length)).existsByName(any(RoleName.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void prodEmptyDbRejectsDefaultPassword() {
        environment.setActiveProfiles("prod");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminEmail", "admin@shopmart.com");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminPassword", "Admin@123456");
        when(userRepository.count()).thenReturn(0L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> dataInitializer.run());
        assertFalse(ex.getMessage().contains("Admin@123456"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void prodEmptyDbRejectsPlaceholderPassword() {
        environment.setActiveProfiles("prod");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminEmail", "admin@shopmart.com");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminPassword", "CHANGE_ME_TO_STRONG_ADMIN_PASSWORD_2026@");
        when(userRepository.count()).thenReturn(0L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> dataInitializer.run());
        assertFalse(ex.getMessage().contains("CHANGE_ME_TO_STRONG_ADMIN_PASSWORD_2026@"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void prodEmptyDbRejectsShortPassword() {
        environment.setActiveProfiles("prod");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminEmail", "admin@shopmart.com");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminPassword", "Ab1!short");
        when(userRepository.count()).thenReturn(0L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> dataInitializer.run());
        assertFalse(ex.getMessage().contains("Ab1!short"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void prodEmptyDbRejectsWeakPasswordMissingComplexity() {
        environment.setActiveProfiles("prod");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminEmail", "admin@shopmart.com");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminPassword", "onlylowercaseletters12");
        when(userRepository.count()).thenReturn(0L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> dataInitializer.run());
        assertFalse(ex.getMessage().contains("onlylowercaseletters12"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void prodNonEmptyDbSkipsSafelyWhenAdminNotConfigured() {
        environment.setActiveProfiles("prod");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminEmail", "");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminPassword", "CHANGE_ME_PLACEHOLDER");
        when(userRepository.count()).thenReturn(5L);

        assertDoesNotThrow(() -> dataInitializer.run());
        verify(roleRepository, times(RoleName.values().length)).existsByName(any(RoleName.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void prodEmptyDbSeedsAdminWithStrongCredentials() {
        environment.setActiveProfiles("prod");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminEmail", "admin@shopmart.com");
        ReflectionTestUtils.setField(dataInitializer, "defaultAdminPassword", "Str0ng!ProdPass2026");
        when(userRepository.existsByEmail("admin@shopmart.com")).thenReturn(false);

        assertDoesNotThrow(() -> dataInitializer.run());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("admin@shopmart.com", userCaptor.getValue().getEmail());
        assertEquals("encoded-password", userCaptor.getValue().getPassword());
    }

    @Test
    void devProfileKeepsDefaultFallbackBehavior() {
        environment.setActiveProfiles("dev");
        when(userRepository.existsByEmail("admin@ecommerce.com")).thenReturn(false);

        assertDoesNotThrow(() -> dataInitializer.run());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("admin@ecommerce.com", userCaptor.getValue().getEmail());
        verify(passwordEncoder).encode("Admin@123456");
    }
}
