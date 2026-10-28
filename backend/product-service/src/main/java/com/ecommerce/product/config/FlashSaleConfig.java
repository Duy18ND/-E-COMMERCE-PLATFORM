package com.ecommerce.product.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.data.redis.serializer.GenericToStringSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.scripting.support.ResourceScriptSource;

/**
 * Configuration for Flash Sale Redis integration.
 *
 * Registers two beans:
 * - RedisScript: loads the Lua deduction script from the classpath.
 * - RedisTemplate: configured with StringRedisSerializer for keys
 *   and GenericToStringSerializer for numeric values.
 */
@Configuration
public class FlashSaleConfig {

    /**
     * Registers the Lua stock-deduction script as a Spring bean.
     *
     * Script contract:
     * - KEYS[1]: stock key (e.g. flash_sale_stock:{productId})
     * - ARGV[1]: quantity to deduct
     * - Returns 1L: success
     * - Returns 0L: not enough stock
     * - Returns -1L: key not found (product not in flash sale)
     *
     * @return configured RedisScript for stock deduction
     */
    @Bean
    public RedisScript<Long> flashSaleScript() {
        DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>();
        redisScript.setScriptSource(
                new ResourceScriptSource(
                        new ClassPathResource("scripts/flash_sale_deduct.lua")));
        redisScript.setResultType(Long.class);
        return redisScript;
    }

    /**
     * Provides a RedisTemplate configured for Flash Sale stock operations.
     *
     * Uses StringRedisSerializer for keys and GenericToStringSerializer for values
     * so numeric stock values are stored as plain strings compatible with Lua script.
     *
     * @param connectionFactory the Redis connection factory
     * @return fully initialised RedisTemplate
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericToStringSerializer<>(Object.class));
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericToStringSerializer<>(Object.class));
        template.afterPropertiesSet();
        return template;
    }
}
