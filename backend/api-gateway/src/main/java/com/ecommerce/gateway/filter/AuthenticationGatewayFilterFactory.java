package com.ecommerce.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.stereotype.Component;

/**
 * Filter factory alias supporting shortcut name "Authentication" in route definitions.
 */
@Component("Authentication")
public class AuthenticationGatewayFilterFactory extends AuthenticationFilter {

    private final AuthenticationFilter delegate;

    public AuthenticationGatewayFilterFactory(AuthenticationFilter delegate) {
        this.delegate = delegate;
    }

    @Override
    public String name() {
        return "Authentication";
    }

    @Override
    public GatewayFilter apply(Config config) {
        return delegate.apply(config);
    }
}
