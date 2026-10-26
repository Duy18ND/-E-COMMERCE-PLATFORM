package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.LoginRequest;
import com.ecommerce.auth.dto.request.RegisterRequest;
import com.ecommerce.auth.dto.request.TokenRefreshRequest;
import com.ecommerce.auth.dto.response.AuthResponse;
import com.ecommerce.auth.exception.GlobalExceptionHandler;
import com.ecommerce.auth.security.JwtTokenProvider;
import com.ecommerce.auth.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthController authController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void shouldRegisterSuccessfully() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("test@ecommerce.com")
                .password("password123")
                .fullName("Test User")
                .phone("0123456789")
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock_access_token")
                .refreshToken("mock_refresh_token")
                .userId(1L)
                .email("test@ecommerce.com")
                .fullName("Test User")
                .roles(List.of("ROLE_USER"))
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@ecommerce.com"))
                .andExpect(jsonPath("$.data.accessToken").value("mock_access_token"));
    }

    @Test
    void shouldReturnBadRequestWhenRegistrationInputInvalid() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid-email")
                .password("123") // too short (< 6 chars)
                .fullName("")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void shouldLoginSuccessfully() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("test@ecommerce.com")
                .password("password123")
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock_access_token")
                .refreshToken("mock_refresh_token")
                .userId(1L)
                .email("test@ecommerce.com")
                .fullName("Test User")
                .roles(List.of("ROLE_USER"))
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock_access_token"));
    }

    @Test
    void shouldRefreshTokenSuccessfully() throws Exception {
        TokenRefreshRequest request = TokenRefreshRequest.builder()
                .refreshToken("valid_refresh_token")
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("new_access_token")
                .refreshToken("valid_refresh_token")
                .userId(1L)
                .email("test@ecommerce.com")
                .fullName("Test User")
                .roles(List.of("ROLE_USER"))
                .build();

        when(authService.refresh(any(TokenRefreshRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new_access_token"));
    }

    @Test
    void shouldLogoutSuccessfully() throws Exception {
        doNothing().when(authService).logout("sample_token");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer sample_token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng xuất thành công"));
    }

    @Test
    void shouldValidateTokenSuccessfully() throws Exception {
        when(jwtTokenProvider.validateToken("valid_jwt")).thenReturn(true);
        when(jwtTokenProvider.getEmailFromToken("valid_jwt")).thenReturn("user@ecommerce.com");
        when(jwtTokenProvider.getUserIdFromToken("valid_jwt")).thenReturn(10L);
        when(jwtTokenProvider.getRolesFromToken("valid_jwt")).thenReturn(List.of("ROLE_USER"));

        mockMvc.perform(get("/api/v1/auth/validate")
                        .header("Authorization", "Bearer valid_jwt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.email").value("user@ecommerce.com"));
    }
}
