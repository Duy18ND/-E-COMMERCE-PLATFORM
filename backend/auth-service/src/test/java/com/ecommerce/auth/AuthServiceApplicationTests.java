package com.ecommerce.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.data.redis.host=localhost",
    "eureka.client.enabled=false",
    "spring.cloud.discovery.enabled=false"
})
class AuthServiceApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contextLoads() {
    }

    @Test
    @DisplayName("GET /api/v1/admin/customers without credentials returns 401 Unauthorized")
    void adminCustomers_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/customers"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("GET /api/v1/admin/customers with ROLE_USER returns 403 Forbidden JSON instead of 401 on /error")
    void adminCustomers_UserRole_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/customers"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.path").value("/api/v1/admin/customers"));
    }
}
