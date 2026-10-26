package com.ecommerce.auth.service;

import com.ecommerce.auth.dto.request.LoginRequest;
import com.ecommerce.auth.dto.request.RegisterRequest;
import com.ecommerce.auth.dto.request.TokenRefreshRequest;
import com.ecommerce.auth.dto.response.AuthResponse;
import com.ecommerce.auth.entity.Role;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.enums.RoleName;
import com.ecommerce.auth.exception.InvalidTokenException;
import com.ecommerce.auth.exception.UserAlreadyExistsException;
import com.ecommerce.auth.repository.RoleRepository;
import com.ecommerce.auth.repository.UserRepository;
import com.ecommerce.auth.security.JwtTokenProvider;
import com.ecommerce.auth.security.UserPrincipal;
import com.ecommerce.auth.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private Authentication authentication;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                userRepository,
                roleRepository,
                passwordEncoder,
                authenticationManager,
                jwtTokenProvider,
                redisTemplate
        );
    }

    @Test
    void shouldRegisterNewUserSuccessfully() {
        RegisterRequest request = RegisterRequest.builder()
                .email("john@ecommerce.com")
                .password("password123")
                .fullName("John Doe")
                .phone("0987654321")
                .build();

        Role userRole = Role.builder().id(1L).name(RoleName.ROLE_USER).build();
        User savedUser = User.builder()
                .id(1L)
                .email("john@ecommerce.com")
                .password("encoded_pass")
                .fullName("John Doe")
                .phone("0987654321")
                .roles(Set.of(userRole))
                .build();

        when(userRepository.existsByEmail("john@ecommerce.com")).thenReturn(false);
        when(roleRepository.findByName(RoleName.ROLE_USER)).thenReturn(Optional.of(userRole));
        when(passwordEncoder.encode("password123")).thenReturn("encoded_pass");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateAccessToken(any(UserPrincipal.class))).thenReturn("access_token");
        when(jwtTokenProvider.generateRefreshToken(any(UserPrincipal.class))).thenReturn("refresh_token");
        when(jwtTokenProvider.getJwtExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("access_token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh_token");
        assertThat(response.getEmail()).isEqualTo("john@ecommerce.com");
        assertThat(response.getRoles()).contains("ROLE_USER");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void shouldThrowExceptionWhenRegisteringExistingEmail() {
        RegisterRequest request = RegisterRequest.builder()
                .email("existing@ecommerce.com")
                .password("password123")
                .fullName("Existing User")
                .build();

        when(userRepository.existsByEmail("existing@ecommerce.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("đã tồn tại");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldLoginSuccessfully() {
        LoginRequest request = LoginRequest.builder()
                .email("john@ecommerce.com")
                .password("password123")
                .build();

        UserPrincipal principal = UserPrincipal.builder()
                .id(1L)
                .email("john@ecommerce.com")
                .fullName("John Doe")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_USER")))
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(jwtTokenProvider.generateAccessToken(principal)).thenReturn("access_token");
        when(jwtTokenProvider.generateRefreshToken(principal)).thenReturn("refresh_token");
        when(jwtTokenProvider.getJwtExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("access_token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh_token");
        assertThat(response.getEmail()).isEqualTo("john@ecommerce.com");
    }

    @Test
    void shouldRefreshAccessTokenSuccessfully() {
        TokenRefreshRequest request = TokenRefreshRequest.builder()
                .refreshToken("valid_refresh_token")
                .build();

        User user = User.builder()
                .id(1L)
                .email("john@ecommerce.com")
                .fullName("John Doe")
                .roles(Set.of(Role.builder().id(1L).name(RoleName.ROLE_USER).build()))
                .build();

        when(jwtTokenProvider.validateToken("valid_refresh_token")).thenReturn(true);
        when(jwtTokenProvider.getEmailFromToken("valid_refresh_token")).thenReturn("john@ecommerce.com");
        when(userRepository.findByEmail("john@ecommerce.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(any(UserPrincipal.class))).thenReturn("new_access_token");
        when(jwtTokenProvider.getJwtExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.refresh(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("new_access_token");
        assertThat(response.getRefreshToken()).isEqualTo("valid_refresh_token");
    }

    @Test
    void shouldThrowExceptionWhenRefreshTokenIsInvalid() {
        TokenRefreshRequest request = TokenRefreshRequest.builder()
                .refreshToken("invalid_token")
                .build();

        when(jwtTokenProvider.validateToken("invalid_token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("không hợp lệ hoặc đã hết hạn");
    }

    @Test
    void shouldBlacklistTokenOnLogout() {
        String token = "sample_access_token";
        when(jwtTokenProvider.getRemainingExpirationMs(token)).thenReturn(50000L);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        authService.logout("Bearer " + token);

        verify(valueOperations, times(1)).set(
                eq(JwtTokenProvider.TOKEN_BLACKLIST_PREFIX + token),
                eq("blacklisted"),
                eq(50000L),
                eq(TimeUnit.MILLISECONDS)
        );
    }
}
