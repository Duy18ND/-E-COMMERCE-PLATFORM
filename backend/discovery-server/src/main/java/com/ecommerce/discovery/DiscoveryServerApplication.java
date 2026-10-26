package com.ecommerce.discovery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

/**
 * Discovery Server — Netflix Eureka Service Registry.
 *
 * <p>All microservices register here on startup and use it for
 * client-side load-balanced service discovery (lb:// URIs in the Gateway).</p>
 *
 * <p>Dashboard: http://localhost:8761</p>
 */
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
