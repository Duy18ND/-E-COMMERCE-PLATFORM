package com.ecommerce.auth.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private JwtTokenProvider jwtTokenProvider;

    private final String secret = "ecommerce-super-secret-key-change-in-production-must-be-256-bits";
    private final long expirationMs = 3600000; // 1 hour
    private final long refreshExpirationMs = 86400000; // 24 hours

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(redisTemplate);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMs", expirationMs);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtRefreshExpirationMs", refreshExpirationMs);
    }

    @Test
    void shouldGenerateAndValidateAccessToken() {
        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(1L)
                .email("test@ecommerce.com")
                .fullName("Nguyen Van Test")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_USER")))
                .build();

        when(redisTemplate.hasKey(anyString())).thenReturn(false);

        String token = jwtTokenProvider.generateAccessToken(userPrincipal);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getEmailFromToken(token)).isEqualTo("test@ecommerce.com");
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo(1L);
        assertThat(jwtTokenProvider.getRolesFromToken(token)).contains("ROLE_USER");
    }

    @Test
    void shouldRejectBlacklistedToken() {
        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(2L)
                .email("blacklisted@ecommerce.com")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_USER")))
                .build();

        String token = jwtTokenProvider.generateAccessToken(userPrincipal);

        when(redisTemplate.hasKey(JwtTokenProvider.TOKEN_BLACKLIST_PREFIX + token)).thenReturn(true);

        assertThat(jwtTokenProvider.validateToken(token)).isFalse();
    }
}
