package com.ecommerce.product.service;

import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link FlashSaleService}.
 *
 * <p>All Redis interactions are mocked with Mockito — no live Redis instance required.
 * Tests validate the three Lua script return-value branches (1, 0, -1) and the
 * {@code null} defensive branch.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FlashSaleService — Unit Tests")
class FlashSaleServiceTest {

    // -----------------------------------------------------------------------
    // Mocks & SUT
    // -----------------------------------------------------------------------

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private RedisScript<Long> flashSaleScript;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private FlashSaleService flashSaleService;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    private static final Long   PRODUCT_ID   = 42L;
    private static final int    QUANTITY     = 3;
    private static final String EXPECTED_KEY = "flash_sale_stock:" + PRODUCT_ID;

    // =======================================================================
    // initFlashSaleStock
    // =======================================================================

    @Nested
    @DisplayName("initFlashSaleStock()")
    class InitFlashSaleStockTests {

        @Test
        @DisplayName("Phải lưu đúng key và stock value vào Redis")
        void shouldSetCorrectKeyAndValueInRedis() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);

            flashSaleService.initFlashSaleStock(PRODUCT_ID, 100);

            verify(valueOperations).set(EXPECTED_KEY, 100);
        }

        @Test
        @DisplayName("Phải gọi opsForValue().set() đúng một lần")
        void shouldCallOpsForValueSetExactlyOnce() {
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);

            flashSaleService.initFlashSaleStock(PRODUCT_ID, 50);

            verify(redisTemplate, times(1)).opsForValue();
            verify(valueOperations, times(1)).set(EXPECTED_KEY, 50);
        }
    }

    // =======================================================================
    // reserveFlashSaleStock
    // =======================================================================

    @Nested
    @DisplayName("reserveFlashSaleStock()")
    class ReserveFlashSaleStockTests {

        // -------------------------------------------------------------------
        // Happy path — Lua returns 1
        // -------------------------------------------------------------------

        @Test
        @DisplayName("Lua trả về 1 → không ném exception (thành công)")
        void whenLuaReturns1_shouldCompleteWithoutException() {
            when(redisTemplate.execute(
                    eq(flashSaleScript),
                    eq(List.of(EXPECTED_KEY)),
                    eq(String.valueOf(QUANTITY))
            )).thenReturn(1L);

            assertThatCode(() ->
                    flashSaleService.reserveFlashSaleStock(PRODUCT_ID, QUANTITY))
                    .doesNotThrowAnyException();

            verify(redisTemplate).execute(
                    eq(flashSaleScript),
                    eq(List.of(EXPECTED_KEY)),
                    eq(String.valueOf(QUANTITY)));
        }

        // -------------------------------------------------------------------
        // Out of stock — Lua returns 0
        // -------------------------------------------------------------------

        @Test
        @DisplayName("Lua trả về 0 → ném NotEnoughStockException với message 'Đã cháy hàng Flash Sale!'")
        void whenLuaReturns0_shouldThrowNotEnoughStockException() {
            when(redisTemplate.execute(
                    eq(flashSaleScript),
                    eq(List.of(EXPECTED_KEY)),
                    eq(String.valueOf(QUANTITY))
            )).thenReturn(0L);

            assertThatThrownBy(() ->
                    flashSaleService.reserveFlashSaleStock(PRODUCT_ID, QUANTITY))
                    .isInstanceOf(NotEnoughStockException.class)
                    .hasMessageContaining("Đã cháy hàng Flash Sale!");
        }

        // -------------------------------------------------------------------
        // Not in flash sale — Lua returns -1
        // -------------------------------------------------------------------

        @Test
        @DisplayName("Lua trả về -1 → ném ResourceNotFoundException với message 'không nằm trong chương trình Flash Sale'")
        void whenLuaReturnsMinus1_shouldThrowResourceNotFoundException() {
            when(redisTemplate.execute(
                    eq(flashSaleScript),
                    eq(List.of(EXPECTED_KEY)),
                    eq(String.valueOf(QUANTITY))
            )).thenReturn(-1L);

            assertThatThrownBy(() ->
                    flashSaleService.reserveFlashSaleStock(PRODUCT_ID, QUANTITY))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("không nằm trong chương trình Flash Sale");
        }

        // -------------------------------------------------------------------
        // Defensive — Redis returns null
        // -------------------------------------------------------------------

        @Test
        @DisplayName("Redis trả về null → ném ResourceNotFoundException (defensive branch)")
        void whenRedisReturnsNull_shouldThrowResourceNotFoundException() {
            when(redisTemplate.execute(
                    eq(flashSaleScript),
                    eq(List.of(EXPECTED_KEY)),
                    eq(String.valueOf(QUANTITY))
            )).thenReturn(null);

            assertThatThrownBy(() ->
                    flashSaleService.reserveFlashSaleStock(PRODUCT_ID, QUANTITY))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Không thể xác định trạng thái Flash Sale");
        }

        // -------------------------------------------------------------------
        // Unexpected Lua result
        // -------------------------------------------------------------------

        @Test
        @DisplayName("Lua trả về giá trị bất ngờ → ném IllegalStateException")
        void whenLuaReturnsUnexpectedValue_shouldThrowIllegalStateException() {
            when(redisTemplate.execute(
                    eq(flashSaleScript),
                    eq(List.of(EXPECTED_KEY)),
                    eq(String.valueOf(QUANTITY))
            )).thenReturn(99L);

            assertThatThrownBy(() ->
                    flashSaleService.reserveFlashSaleStock(PRODUCT_ID, QUANTITY))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Unexpected Lua script result");
        }
    }
}

