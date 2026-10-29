package com.ecommerce.product.service;

import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for Flash Sale operations backed by atomic Redis Lua scripts.
 *
 * <h3>Why Lua?</h3>
 * Redis executes Lua scripts atomically on a single thread — no two scripts
 * can interleave. This eliminates the classic
 * <em>check-then-act</em> race condition that causes overselling when thousands
 * of users hit the endpoint simultaneously.
 *
 * <h3>Key format</h3>
 * {@code flash_sale_stock:{productId}} — stores the remaining stock as a plain
 * integer string so Lua's {@code tonumber()} and Redis {@code DECRBY} work correctly.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlashSaleService {

    private static final String KEY_PREFIX = "flash_sale_stock:";

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<Long>             flashSaleScript;

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Initialises (or resets) the Flash Sale stock for a product in Redis.
     *
     * <p>Calling this method again with a different {@code stock} value
     * effectively resets the counter, which is useful for running multiple
     * flash sale rounds.</p>
     *
     * @param productId the product ID
     * @param stock     the number of items available in this flash sale
     */
    public void initFlashSaleStock(Long productId, int stock) {
        String key = buildKey(productId);
        redisTemplate.opsForValue().set(key, stock);
        log.info("[FlashSale] Stock initialised — key={}, stock={}", key, stock);
    }

    /**
     * Atomically reserves Flash Sale stock using the registered Lua script.
     *
     * <table border="1">
     *   <tr><th>Script return</th><th>Meaning</th><th>Action</th></tr>
     *   <tr><td>{@code 1}</td><td>Success</td><td>Returns normally</td></tr>
     *   <tr><td>{@code 0}</td><td>Out of stock</td><td>Throws {@link NotEnoughStockException}</td></tr>
     *   <tr><td>{@code -1}</td><td>Key not found</td><td>Throws {@link ResourceNotFoundException}</td></tr>
     * </table>
     *
     * @param productId the product ID
     * @param quantity  number of items to reserve
     * @throws NotEnoughStockException   when flash sale stock is exhausted
     * @throws ResourceNotFoundException when the product is not part of any active flash sale
     */
    public void reserveFlashSaleStock(Long productId, int quantity) {
        String key = buildKey(productId);

        Long result = redisTemplate.execute(
                flashSaleScript,
                List.of(key),
                String.valueOf(quantity)
        );

        log.debug("[FlashSale] Lua result={} — productId={}, qty={}", result, productId, quantity);

        if (result == null) {
            // Defensive: should not happen with a correctly configured RedisTemplate
            throw new ResourceNotFoundException(
                    "Không thể xác định trạng thái Flash Sale cho sản phẩm: " + productId);
        }

        switch (result.intValue()) {
            case 1  -> log.info("[FlashSale] Reserved OK — productId={}, qty={}", productId, quantity);
            case 0  -> throw new NotEnoughStockException("Đã cháy hàng Flash Sale!");
            case -1 -> throw new ResourceNotFoundException(
                            "Sản phẩm không nằm trong chương trình Flash Sale");
            default -> throw new IllegalStateException(
                            "[FlashSale] Unexpected Lua script result: " + result);
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private String buildKey(Long productId) {
        return KEY_PREFIX + productId;
    }
}

