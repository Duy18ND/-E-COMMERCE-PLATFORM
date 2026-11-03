package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CreateFlashSaleCampaignRequest;
import com.ecommerce.product.dto.request.FlashSaleItemRequest;
import com.ecommerce.product.dto.response.ActiveFlashSaleDto;
import com.ecommerce.product.dto.response.FlashSaleCampaignResponse;
import com.ecommerce.product.entity.FlashSaleCampaign;
import com.ecommerce.product.entity.FlashSaleItem;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.FlashSaleCampaignRepository;
import com.ecommerce.product.repository.FlashSaleItemRepository;
import com.ecommerce.product.repository.ProductRepository;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link FlashSaleService}.
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

    @Mock
    private FlashSaleCampaignRepository campaignRepository;

    @Mock
    private FlashSaleItemRepository flashSaleItemRepository;

    @Mock
    private ProductRepository productRepository;

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

    // =======================================================================
    // Campaign Management & Price / Quantity Control
    // =======================================================================

    @Nested
    @DisplayName("Campaign Management & Price/Quantity Validation")
    class CampaignManagementTests {

        private Product buildSampleProduct(Long id, BigDecimal price, int stock) {
            return Product.builder()
                    .id(id)
                    .name("MacBook Pro 14 M3")
                    .price(price)
                    .stockQuantity(stock)
                    .category("Laptops")
                    .status(ProductStatus.ACTIVE)
                    .build();
        }

        @Test
        @DisplayName("Tạo chiến dịch đang trong khung giờ hiệu lực → gán ACTIVE và đồng bộ tồn kho lên Redis")
        void createCampaign_WhenCurrentlyActive_ShouldSetActiveAndSyncRedis() {
            Product product = buildSampleProduct(10L, new BigDecimal("2000.00"), 50);
            when(productRepository.findById(10L)).thenReturn(Optional.of(product));
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(campaignRepository.save(any(FlashSaleCampaign.class))).thenAnswer(inv -> {
                FlashSaleCampaign c = inv.getArgument(0);
                c.setId(1L);
                return c;
            });

            CreateFlashSaleCampaignRequest request = CreateFlashSaleCampaignRequest.builder()
                    .name("Siêu Sale Giờ Vàng")
                    .startTime(LocalDateTime.now().minusMinutes(10))
                    .endTime(LocalDateTime.now().plusHours(4))
                    .items(List.of(FlashSaleItemRequest.builder()
                            .productId(10L)
                            .flashSalePrice(new BigDecimal("1499.00"))
                            .quantity(20)
                            .userLimit(2)
                            .build()))
                    .build();

            FlashSaleCampaignResponse response = flashSaleService.createCampaign(request);

            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(1L);
            assertThat(response.getStatus()).isEqualTo("ACTIVE");
            assertThat(response.getItems()).hasSize(1);
            assertThat(response.getItems().get(0).getFlashSalePrice()).isEqualByComparingTo("1499.00");
            assertThat(response.getItems().get(0).getOriginalPrice()).isEqualByComparingTo("2000.00");

            verify(valueOperations).set("flash_sale_stock:10", 20);
            verify(campaignRepository, times(1)).save(any(FlashSaleCampaign.class));
        }

        @Test
        @DisplayName("Tạo chiến dịch ở tương lai → gán UPCOMING và chưa nạp Redis")
        void createCampaign_WhenInFuture_ShouldSetUpcomingWithoutSyncingRedis() {
            Product product = buildSampleProduct(10L, new BigDecimal("2000.00"), 50);
            when(productRepository.findById(10L)).thenReturn(Optional.of(product));
            when(campaignRepository.save(any(FlashSaleCampaign.class))).thenAnswer(inv -> {
                FlashSaleCampaign c = inv.getArgument(0);
                c.setId(2L);
                return c;
            });

            CreateFlashSaleCampaignRequest request = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Tuần Sau")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(2))
                    .items(List.of(FlashSaleItemRequest.builder()
                            .productId(10L)
                            .flashSalePrice(new BigDecimal("1500.00"))
                            .quantity(15)
                            .userLimit(2)
                            .build()))
                    .build();

            FlashSaleCampaignResponse response = flashSaleService.createCampaign(request);

            assertThat(response.getStatus()).isEqualTo("UPCOMING");
            verify(redisTemplate, never()).opsForValue();
        }

        @Test
        @DisplayName("Chặn tạo chiến dịch khi flashSalePrice >= originalPrice → ném IllegalArgumentException")
        void createCampaign_WhenFlashSalePriceNotLessThanOriginal_ShouldThrowIllegalArgumentException() {
            Product product = buildSampleProduct(10L, new BigDecimal("1000.00"), 50);
            when(productRepository.findById(10L)).thenReturn(Optional.of(product));

            CreateFlashSaleCampaignRequest request = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Sai Giá")
                    .startTime(LocalDateTime.now().minusMinutes(5))
                    .endTime(LocalDateTime.now().plusHours(2))
                    .items(List.of(FlashSaleItemRequest.builder()
                            .productId(10L)
                            .flashSalePrice(new BigDecimal("1000.00")) // Bằng giá gốc -> không hợp lệ
                            .quantity(10)
                            .userLimit(2)
                            .build()))
                    .build();

            assertThatThrownBy(() -> flashSaleService.createCampaign(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Giá Flash Sale phải nhỏ hơn giá gốc niêm yết");

            verify(campaignRepository, never()).save(any());
        }

        @Test
        @DisplayName("Chặn tạo chiến dịch khi quantity > stockQuantity → ném IllegalArgumentException")
        void createCampaign_WhenQuantityExceedsProductStock_ShouldThrowIllegalArgumentException() {
            Product product = buildSampleProduct(10L, new BigDecimal("1000.00"), 8);
            when(productRepository.findById(10L)).thenReturn(Optional.of(product));

            CreateFlashSaleCampaignRequest request = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Quá Kho")
                    .startTime(LocalDateTime.now().minusMinutes(5))
                    .endTime(LocalDateTime.now().plusHours(2))
                    .items(List.of(FlashSaleItemRequest.builder()
                            .productId(10L)
                            .flashSalePrice(new BigDecimal("799.00"))
                            .quantity(20) // Vượt quá tồn kho thực tế (8)
                            .userLimit(2)
                            .build()))
                    .build();

            assertThatThrownBy(() -> flashSaleService.createCampaign(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Số lượng Flash Sale vượt quá tồn kho thực tế của sản phẩm");

            verify(campaignRepository, never()).save(any());
        }

        @Test
        @DisplayName("Cập nhật trạng thái chiến dịch sang ACTIVE nạp tồn kho còn lại lên Redis, sang ENDED xóa key Redis")
        void updateCampaignStatus_ShouldSyncOrCleanRedisKeys() {
            FlashSaleCampaign campaign = FlashSaleCampaign.builder()
                    .id(5L)
                    .name("Flash Sale Cuối Tuần")
                    .startTime(LocalDateTime.now().plusHours(1))
                    .endTime(LocalDateTime.now().plusHours(5))
                    .status("UPCOMING")
                    .build();
            FlashSaleItem item = FlashSaleItem.builder()
                    .id(50L)
                    .productId(10L)
                    .flashSalePrice(new BigDecimal("800.00"))
                    .quantity(30)
                    .soldQuantity(5)
                    .userLimit(2)
                    .build();
            campaign.addItem(item);

            when(campaignRepository.findByIdWithItems(5L)).thenReturn(Optional.of(campaign));
            when(campaignRepository.save(any(FlashSaleCampaign.class))).thenAnswer(inv -> inv.getArgument(0));
            when(productRepository.findAllById(any())).thenReturn(List.of(
                    buildSampleProduct(10L, new BigDecimal("1200.00"), 50)));
            when(redisTemplate.opsForValue()).thenReturn(valueOperations);

            // Kích hoạt sang ACTIVE -> nạp remaining = 30 - 5 = 25 vào Redis
            FlashSaleCampaignResponse activated = flashSaleService.updateCampaignStatus(5L, "ACTIVE");
            assertThat(activated.getStatus()).isEqualTo("ACTIVE");
            verify(valueOperations).set("flash_sale_stock:10", 25);

            // Kết thúc sang ENDED -> xóa key khỏi Redis
            FlashSaleCampaignResponse ended = flashSaleService.updateCampaignStatus(5L, "ENDED");
            assertThat(ended.getStatus()).isEqualTo("ENDED");
            verify(redisTemplate).delete("flash_sale_stock:10");
        }

        @Test
        @DisplayName("getActiveFlashSaleForProduct() trả về đúng ActiveFlashSaleDto khi sản phẩm đang có Flash Sale")
        void getActiveFlashSaleForProduct_ShouldReturnDtoWhenActive() {
            LocalDateTime endTime = LocalDateTime.now().plusHours(3);
            FlashSaleCampaign campaign = FlashSaleCampaign.builder()
                    .id(9L)
                    .name("Sale Đêm")
                    .startTime(LocalDateTime.now().minusHours(1))
                    .endTime(endTime)
                    .status("ACTIVE")
                    .build();
            FlashSaleItem item = FlashSaleItem.builder()
                    .id(90L)
                    .productId(10L)
                    .flashSalePrice(new BigDecimal("699.00"))
                    .quantity(20)
                    .soldQuantity(6)
                    .userLimit(2)
                    .build();
            campaign.addItem(item);

            when(flashSaleItemRepository.findActiveByProductId(eq(10L), any(LocalDateTime.class)))
                    .thenReturn(Optional.of(item));

            ActiveFlashSaleDto dto = flashSaleService.getActiveFlashSaleForProduct(10L);

            assertThat(dto).isNotNull();
            assertThat(dto.getCampaignId()).isEqualTo(9L);
            assertThat(dto.getFlashSalePrice()).isEqualByComparingTo("699.00");
            assertThat(dto.getRemainingStock()).isEqualTo(14);
            assertThat(dto.getUserLimit()).isEqualTo(2);
            assertThat(dto.getEndTime()).isEqualTo(endTime);
        }
    }
}
