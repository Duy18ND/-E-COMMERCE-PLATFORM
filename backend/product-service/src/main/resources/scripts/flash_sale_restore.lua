-- ============================================================
-- Flash Sale Atomic Stock Restoration Script
-- ============================================================
-- Restores reserved stock in Redis ONLY when the campaign key
-- currently exists (so ended/deleted campaigns are not resurrected),
-- clamping the updated value to maxStock when provided (>= 0).
--
-- KEYS[1] : Redis key for the product stock (e.g. "flash_sale_stock:42")
-- ARGV[1] : Quantity to restore (as string)
-- ARGV[2] : Maximum campaign item stock ceiling, or "-1" if unbounded
--
-- Return values:
--  >= 0 -> Updated remaining stock after restoration
--   -1  -> Key does not exist
-- ============================================================

local key      = KEYS[1]
local quantity = tonumber(ARGV[1])
local maxStock = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current == false then
    return -1
end

current = tonumber(current)
local updated = current + quantity
if maxStock ~= nil and maxStock >= 0 and updated > maxStock then
    updated = maxStock
end

redis.call('SET', key, updated)
return updated

