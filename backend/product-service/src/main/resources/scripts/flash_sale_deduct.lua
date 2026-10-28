-- KEYS[1]: flash_sale_stock:{productId}
-- ARGV[1]: quantity to deduct

local key = KEYS[1]
local quantity = tonumber(ARGV[1])

-- 1. Kiểm tra sự tồn tại của key trong Redis
if redis.call('EXISTS', key) == 0 then
    return -1
end

-- 2. Lấy số lượng tồn kho hiện tại
local current_stock = tonumber(redis.call('GET', key))
if not current_stock then
    return -1
end

-- 3. Kiểm tra số lượng tồn và trừ kho nguyên tử (Atomic DECRBY)
if current_stock >= quantity then
    redis.call('DECRBY', key, quantity)
    return 1
else
    return 0
end
