-- ============================================================
-- Flash Sale Atomic Stock Deduction Script
-- ============================================================
-- Executed atomically on a single Redis node (single-threaded
-- Lua execution guarantees no race conditions / overselling).
--
-- KEYS[1] : Redis key for the product stock
--           e.g. "flash_sale_stock:42"
-- ARGV[1] : Quantity to deduct (as string)
--
-- Return values:
--   1  -> Success: stock was sufficient; DECRBY applied.
--   0  -> Failure: not enough stock (out of stock).
--  -1  -> Key does not exist (product not in flash sale).
-- ============================================================

local key      = KEYS[1]
local quantity = tonumber(ARGV[1])

-- Check existence first to distinguish "not in flash sale" from "out of stock"
local current = redis.call('GET', key)
if current == false then
    return -1
end

current = tonumber(current)

if current >= quantity then
    redis.call('DECRBY', key, quantity)
    return 1
else
    return 0
end
