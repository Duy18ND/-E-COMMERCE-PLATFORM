package com.ecommerce.product.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ecommerce.product.dto.request.CreateFlashSaleCampaignRequest;
import com.ecommerce.product.dto.request.FlashSaleItemRequest;
import com.ecommerce.product.dto.response.ActiveFlashSaleDto;
import com.ecommerce.product.dto.response.FlashSaleCampaignResponse;
import com.ecommerce.product.dto.response.FlashSaleItemResponse;
import com.ecommerce.product.entity.FlashSaleCampaign;
import com.ecommerce.product.entity.FlashSaleItem;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.FlashSaleCampaignRepository;
import com.ecommerce.product.repository.FlashSaleItemRepository;
import com.ecommerce.product.repository.ProductRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for Flash Sale campaign management and atomic Redis Lua stock reservation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FlashSaleService {

    private static final String KEY_PREFIX = "flash_sale_stock:";
    private static final Set<String> ALLOWED_STATUSES = Set.of("UPCOMING", "ACTIVE", "ENDED", "CANCELLED");

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<Long>             flashSaleScript;
    private final FlashSaleCampaignRepository   campaignRepository;
    private final FlashSaleItemRepository       flashSaleItemRepository;
    private final ProductRepository             productRepository;

    // -----------------------------------------------------------------------
    // Redis Atomic Lua Operations
    // -----------------------------------------------------------------------

    /**
     * Initialises (or resets) the Flash Sale stock for a product in Redis.
     */
    public void initFlashSaleStock(Long productId, int stock) {
        String key = buildKey(productId);
        ValueOperations<String, Object> ops = redisTemplate.opsForValue();
        if (ops != null) {
            ops.set(key, stock);
        }
        log.info("[FlashSale] Stock initialised — key={}, stock={}", key, stock);
    }

    /**
     * Atomically reserves Flash Sale stock using the registered Lua script,
     * and synchronises soldQuantity in the database when an active campaign item exists.
     */
    @Transactional
    public void reserveFlashSaleStock(Long productId, int quantity) {
        String key = buildKey(productId);

        Long result = redisTemplate.execute(
                flashSaleScript,
                List.of(key),
                String.valueOf(quantity)
        );

        log.debug("[FlashSale] Lua result={} — productId={}, qty={}", result, productId, quantity);

        if (result == null) {
            throw new ResourceNotFoundException(
                    "Không thể xác định trạng thái Flash Sale cho sản phẩm: " + productId);
        }

        // Self-heal Redis if key was evicted/restarted while an active DB campaign exists
        if (result.intValue() == -1 && flashSaleItemRepository != null) {
            FlashSaleItem activeDbItem = flashSaleItemRepository
                    .findActiveByProductId(productId, LocalDateTime.now())
                    .orElse(null);
            if (activeDbItem != null) {
                int remaining = Math.max(0, activeDbItem.getQuantity() - safeInt(activeDbItem.getSoldQuantity()));
                initFlashSaleStock(productId, remaining);
                result = redisTemplate.execute(
                        flashSaleScript,
                        List.of(key),
                        String.valueOf(quantity)
                );
                if (result == null) {
                    throw new ResourceNotFoundException(
                            "Không thể xác định trạng thái Flash Sale cho sản phẩm: " + productId);
                }
            }
        }

        switch (result.intValue()) {
            case 1 -> {
                log.info("[FlashSale] Reserved OK — productId={}, qty={}", productId, quantity);
                incrementDbSoldQuantity(productId, quantity);
            }
            case 0 -> throw new NotEnoughStockException("Đã cháy hàng Flash Sale!");
            case -1 -> throw new ResourceNotFoundException(
                    "Sản phẩm không nằm trong chương trình Flash Sale");
            default -> throw new IllegalStateException(
                    "[FlashSale] Unexpected Lua script result: " + result);
        }
    }

    // -----------------------------------------------------------------------
    // Campaign Management & Public Query APIs
    // -----------------------------------------------------------------------

    @Transactional
    public FlashSaleCampaignResponse createCampaign(CreateFlashSaleCampaignRequest request) {
        validateCampaignRequest(request);

        Map<Long, Product> validatedProducts = validateAndLoadProducts(request.getItems(), Collections.emptyMap());

        LocalDateTime now = LocalDateTime.now();
        boolean isActiveNow = !request.getStartTime().isAfter(now) && request.getEndTime().isAfter(now);
        String initialStatus = isActiveNow ? "ACTIVE" : "UPCOMING";

        FlashSaleCampaign campaign = FlashSaleCampaign.builder()
                .name(request.getName().trim())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(initialStatus)
                .build();

        for (FlashSaleItemRequest itemReq : request.getItems()) {
            FlashSaleItem item = FlashSaleItem.builder()
                    .productId(itemReq.getProductId())
                    .flashSalePrice(itemReq.getFlashSalePrice())
                    .quantity(itemReq.getQuantity())
                    .soldQuantity(0)
                    .userLimit(itemReq.getUserLimit())
                    .build();
            campaign.addItem(item);
        }

        FlashSaleCampaign saved = campaignRepository.save(campaign);

        if ("ACTIVE".equals(saved.getStatus())) {
            for (FlashSaleItem item : saved.getItems()) {
                safeInitRedisStock(item.getProductId(), item.getQuantity());
            }
        }

        log.info("[FlashSale] Created campaign id={}, name='{}', status={}",
                saved.getId(), saved.getName(), saved.getStatus());
        return mapToCampaignResponse(saved, validatedProducts);
    }

    @Transactional
    public FlashSaleCampaignResponse updateCampaign(Long id, CreateFlashSaleCampaignRequest request) {
        validateCampaignRequest(request);

        FlashSaleCampaign campaign = campaignRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chiến dịch Flash Sale với ID: " + id));

        Map<Long, Integer> existingSoldMap = new HashMap<>();
        Set<Long> previousProductIds = new HashSet<>();
        if (campaign.getItems() != null) {
            for (FlashSaleItem oldItem : campaign.getItems()) {
                existingSoldMap.put(oldItem.getProductId(), safeInt(oldItem.getSoldQuantity()));
                previousProductIds.add(oldItem.getProductId());
            }
        }

        Map<Long, Product> validatedProducts = validateAndLoadProducts(request.getItems(), existingSoldMap);

        String previousStatus = campaign.getStatus();
        LocalDateTime now = LocalDateTime.now();
        String updatedStatus;
        if ("CANCELLED".equals(previousStatus)) {
            updatedStatus = "CANCELLED";
        } else if (!request.getEndTime().isAfter(now)) {
            updatedStatus = "ENDED";
        } else if (!request.getStartTime().isAfter(now)) {
            updatedStatus = "ACTIVE";
        } else {
            updatedStatus = "UPCOMING";
        }

        campaign.setName(request.getName().trim());
        campaign.setStartTime(request.getStartTime());
        campaign.setEndTime(request.getEndTime());
        campaign.setStatus(updatedStatus);
        campaign.clearItems();
        campaignRepository.flush();

        Set<Long> newProductIds = new HashSet<>();
        for (FlashSaleItemRequest itemReq : request.getItems()) {
            int preservedSold = existingSoldMap.getOrDefault(itemReq.getProductId(), 0);
            FlashSaleItem item = FlashSaleItem.builder()
                    .productId(itemReq.getProductId())
                    .flashSalePrice(itemReq.getFlashSalePrice())
                    .quantity(itemReq.getQuantity())
                    .soldQuantity(preservedSold)
                    .userLimit(itemReq.getUserLimit())
                    .build();
            campaign.addItem(item);
            newProductIds.add(itemReq.getProductId());
        }

        FlashSaleCampaign saved = campaignRepository.save(campaign);

        // Remove Redis keys for products dropped from an active campaign
        if ("ACTIVE".equals(previousStatus)) {
            for (Long oldPid : previousProductIds) {
                if (!newProductIds.contains(oldPid) || !"ACTIVE".equals(updatedStatus)) {
                    safeDeleteRedisStock(oldPid);
                }
            }
        }

        if ("ACTIVE".equals(updatedStatus)) {
            for (FlashSaleItem item : saved.getItems()) {
                int remaining = Math.max(0, item.getQuantity() - safeInt(item.getSoldQuantity()));
                safeInitRedisStock(item.getProductId(), remaining);
            }
        }

        log.info("[FlashSale] Updated campaign id={}, status={}", saved.getId(), saved.getStatus());
        return mapToCampaignResponse(saved, validatedProducts);
    }

    @Transactional
    public FlashSaleCampaignResponse updateCampaignStatus(Long id, String status) {
        String normalizedStatus = status != null ? status.trim().toUpperCase() : "";
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new IllegalArgumentException(
                    "Trạng thái chiến dịch không hợp lệ: '" + status + "'. Chỉ chấp nhận: UPCOMING, ACTIVE, ENDED, CANCELLED");
        }

        FlashSaleCampaign campaign = campaignRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chiến dịch Flash Sale với ID: " + id));

        LocalDateTime now = LocalDateTime.now();
        if ("ACTIVE".equals(normalizedStatus)) {
            if (!campaign.getEndTime().isAfter(now)) {
                throw new IllegalArgumentException("Không thể kích hoạt chiến dịch đã quá thời gian kết thúc");
            }
            if (campaign.getStartTime().isAfter(now)) {
                campaign.setStartTime(now);
            }
        }

        campaign.setStatus(normalizedStatus);
        FlashSaleCampaign saved = campaignRepository.save(campaign);

        if ("ACTIVE".equals(normalizedStatus)) {
            for (FlashSaleItem item : saved.getItems()) {
                int remaining = Math.max(0, item.getQuantity() - safeInt(item.getSoldQuantity()));
                safeInitRedisStock(item.getProductId(), remaining);
            }
        } else if ("ENDED".equals(normalizedStatus) || "CANCELLED".equals(normalizedStatus)) {
            for (FlashSaleItem item : saved.getItems()) {
                safeDeleteRedisStock(item.getProductId());
            }
        }

        log.info("[FlashSale] Campaign id={} status changed to {}", id, normalizedStatus);
        return mapToCampaignResponse(saved, loadProductMapForCampaigns(List.of(saved)));
    }

    @Transactional
    public void deleteCampaign(Long id) {
        FlashSaleCampaign campaign = campaignRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chiến dịch Flash Sale với ID: " + id));

        if (campaign.getItems() != null) {
            for (FlashSaleItem item : campaign.getItems()) {
                safeDeleteRedisStock(item.getProductId());
            }
        }

        campaignRepository.delete(campaign);
        log.info("[FlashSale] Deleted campaign id={}", id);
    }

    @Transactional(readOnly = true)
    public List<FlashSaleCampaignResponse> getActiveCampaigns() {
        List<FlashSaleCampaign> campaigns = campaignRepository.findActiveCampaigns(LocalDateTime.now());
        Map<Long, Product> productMap = loadProductMapForCampaigns(campaigns);
        return campaigns.stream()
                .map(c -> mapToCampaignResponse(c, productMap))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FlashSaleCampaignResponse> getAllCampaigns() {
        List<FlashSaleCampaign> campaigns = campaignRepository.findAllWithItems();
        Map<Long, Product> productMap = loadProductMapForCampaigns(campaigns);
        return campaigns.stream()
                .map(c -> mapToCampaignResponse(c, productMap))
                .toList();
    }

    @Transactional(readOnly = true)
    public FlashSaleCampaignResponse getCampaignById(Long id) {
        FlashSaleCampaign campaign = campaignRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chiến dịch Flash Sale với ID: " + id));
        return mapToCampaignResponse(campaign, loadProductMapForCampaigns(List.of(campaign)));
    }

    @Transactional(readOnly = true)
    public ActiveFlashSaleDto getActiveFlashSaleForProduct(Long productId) {
        if (productId == null || flashSaleItemRepository == null) {
            return null;
        }
        return flashSaleItemRepository.findActiveByProductId(productId, LocalDateTime.now())
                .map(item -> {
                    int sold = safeInt(item.getSoldQuantity());
                    int remaining = Math.max(0, item.getQuantity() - sold);
                    if (remaining <= 0) {
                        return null;
                    }
                    return ActiveFlashSaleDto.builder()
                            .campaignId(item.getCampaign() != null ? item.getCampaign().getId() : null)
                            .flashSalePrice(item.getFlashSalePrice())
                            .quantity(item.getQuantity())
                            .soldQuantity(sold)
                            .remainingStock(remaining)
                            .userLimit(item.getUserLimit())
                            .endTime(item.getCampaign() != null ? item.getCampaign().getEndTime() : null)
                            .build();
                })
                .orElse(null);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private void validateCampaignRequest(CreateFlashSaleCampaignRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu chiến dịch Flash Sale không được để trống");
        }
        if (request.getStartTime() == null || request.getEndTime() == null
                || !request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Chiến dịch phải có ít nhất 1 sản phẩm tham gia");
        }
    }

    private Map<Long, Product> validateAndLoadProducts(List<FlashSaleItemRequest> items,
                                                       Map<Long, Integer> existingSoldMap) {
        Map<Long, Product> productMap = new HashMap<>();
        Set<Long> seenProductIds = new HashSet<>();

        for (FlashSaleItemRequest itemReq : items) {
            if (!seenProductIds.add(itemReq.getProductId())) {
                throw new IllegalArgumentException(
                        "Sản phẩm ID " + itemReq.getProductId() + " bị trùng lặp trong cùng một chiến dịch");
            }

            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy sản phẩm với ID: " + itemReq.getProductId()));

            if (itemReq.getFlashSalePrice() == null
                    || itemReq.getFlashSalePrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Giá Flash Sale phải lớn hơn 0");
            }

            if (itemReq.getFlashSalePrice().compareTo(product.getPrice()) >= 0) {
                throw new IllegalArgumentException("Giá Flash Sale phải nhỏ hơn giá gốc niêm yết");
            }

            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new IllegalArgumentException("Số lượng Flash Sale tối thiểu là 1");
            }

            if (itemReq.getQuantity() > product.getStockQuantity()) {
                throw new IllegalArgumentException("Số lượng Flash Sale vượt quá tồn kho thực tế của sản phẩm");
            }

            int alreadySold = existingSoldMap.getOrDefault(itemReq.getProductId(), 0);
            if (itemReq.getQuantity() < alreadySold) {
                throw new IllegalArgumentException(
                        "Số lượng Flash Sale mới (" + itemReq.getQuantity()
                                + ") không được nhỏ hơn số lượng đã bán (" + alreadySold + ")");
            }

            if (itemReq.getUserLimit() == null || itemReq.getUserLimit() < 1) {
                throw new IllegalArgumentException("Giới hạn mua tối thiểu là 1");
            }

            productMap.put(product.getId(), product);
        }

        return productMap;
    }

    private void incrementDbSoldQuantity(Long productId, int quantity) {
        if (flashSaleItemRepository == null) {
            return;
        }
        List<FlashSaleItem> activeItems = flashSaleItemRepository
                .findActiveItemsByProductId(productId, LocalDateTime.now());
        if (activeItems != null && !activeItems.isEmpty()) {
            FlashSaleItem activeItem = activeItems.get(0);
            int updatedSold = safeInt(activeItem.getSoldQuantity()) + quantity;
            activeItem.setSoldQuantity(Math.min(updatedSold, activeItem.getQuantity()));
            flashSaleItemRepository.save(activeItem);
        }
    }

    private void safeInitRedisStock(Long productId, int stock) {
        try {
            initFlashSaleStock(productId, stock);
        } catch (Exception ex) {
            log.warn("[FlashSale] Could not sync stock to Redis for productId={}: {}", productId, ex.getMessage());
        }
    }

    private void safeDeleteRedisStock(Long productId) {
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(buildKey(productId));
            }
        } catch (Exception ex) {
            log.warn("[FlashSale] Could not delete Redis key for productId={}: {}", productId, ex.getMessage());
        }
    }

    private Map<Long, Product> loadProductMapForCampaigns(List<FlashSaleCampaign> campaigns) {
        if (campaigns == null || campaigns.isEmpty() || productRepository == null) {
            return Collections.emptyMap();
        }
        Set<Long> productIds = campaigns.stream()
                .filter(c -> c.getItems() != null)
                .flatMap(c -> c.getItems().stream())
                .map(FlashSaleItem::getProductId)
                .collect(Collectors.toSet());
        if (productIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a));
    }

    private FlashSaleCampaignResponse mapToCampaignResponse(FlashSaleCampaign campaign,
                                                            Map<Long, Product> productMap) {
        List<FlashSaleItemResponse> itemResponses = campaign.getItems() == null
                ? Collections.emptyList()
                : campaign.getItems().stream()
                .map(item -> {
                    Product product = productMap != null ? productMap.get(item.getProductId()) : null;
                    int sold = safeInt(item.getSoldQuantity());
                    int remaining = Math.max(0, safeInt(item.getQuantity()) - sold);
                    return FlashSaleItemResponse.builder()
                            .id(item.getId())
                            .productId(item.getProductId())
                            .productName(product != null ? product.getName() : null)
                            .originalPrice(product != null ? product.getPrice() : null)
                            .imageUrl(product != null ? product.getImageUrl() : null)
                            .category(product != null ? product.getCategory() : null)
                            .flashSalePrice(item.getFlashSalePrice())
                            .quantity(item.getQuantity())
                            .soldQuantity(sold)
                            .remainingStock(remaining)
                            .userLimit(item.getUserLimit())
                            .build();
                })
                .toList();

        return FlashSaleCampaignResponse.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .startTime(campaign.getStartTime())
                .endTime(campaign.getEndTime())
                .status(campaign.getStatus())
                .items(itemResponses)
                .createdAt(campaign.getCreatedAt())
                .updatedAt(campaign.getUpdatedAt())
                .build();
    }

    private int safeInt(Integer value) {
        return value != null ? value : 0;
    }

    private String buildKey(Long productId) {
        return KEY_PREFIX + productId;
    }
}
