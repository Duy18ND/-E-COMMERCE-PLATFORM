/**
 * Dữ liệu khởi tạo và dự phòng (Fallback) cho các Module:
 * - Product (Sản phẩm)
 * - Category (Danh mục)
 * - Inventory (Kho hàng)
 *
 * Lưu ý: ID 1, 2, 3... được đồng bộ chính xác với DataInitializer.java ở Backend để khi Cart
 * gọi /api/v1/cart/items với productId = 1, 2, 3 thì MySQL tìm thấy bản ghi.
 */

export const INITIAL_CATEGORIES = [
  {
    id: 'phones',
    slug: 'phones',
    name: 'Điện thoại & Tablet',
    aliases: ['phones', 'điện thoại', 'điện thoại & tablet', 'smartphone & tablet'],
    description: 'iPhone, Galaxy, iPad thế hệ mới chính hãng phân phối',
    desc: 'iPhone, Galaxy, iPad thế hệ mới',
    count: '1.2k+ SP',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeColor: '#2563eb',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'laptops',
    slug: 'laptops',
    name: 'Laptop & Workstation',
    aliases: ['laptops', 'laptop', 'laptop & workstation', 'laptop & mac'],
    description: 'MacBook, Dell XPS, ThinkPad phục vụ học tập, đồ họa, lập trình',
    desc: 'MacBook, Dell XPS, ThinkPad',
    count: '850+ SP',
    iconBg: '#eef2ff',
    iconColor: '#4f46e5',
    badgeBg: '#eef2ff',
    badgeColor: '#4f46e5',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'accessories',
    slug: 'accessories',
    name: 'Phụ Kiện & Âm Thanh',
    aliases: ['accessories', 'phụ kiện', 'phụ kiện & âm thanh', 'thời trang & phụ kiện'],
    description: 'Tai nghe hi-res, bàn phím cơ, chuột không dây và củ sạc nhanh',
    desc: 'Tai nghe hi-res, bàn phím cơ, sạc',
    count: '3.4k+ SP',
    iconBg: '#fff7ed',
    iconColor: '#ea580c',
    badgeBg: '#fff7ed',
    badgeColor: '#ea580c',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'smarthome',
    slug: 'smarthome',
    name: 'Nhà Thông Minh & Gia Dụng',
    aliases: ['smarthome', 'nhà thông minh', 'nhà thông minh & gia dụng', 'smart living'],
    description: 'Robot hút bụi, máy lọc không khí và đèn thông minh tiện nghi',
    desc: 'Robot hút bụi, máy lọc không khí',
    count: '920+ SP',
    iconBg: '#fff1f2',
    iconColor: '#e11d48',
    badgeBg: '#fff1f2',
    badgeColor: '#e11d48',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80'
  }
];

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: 'Laptop Dell XPS 15 OLED (Core i7 / 16GB / 1TB SSD)',
    category: 'Laptop & Workstation',
    categoryId: 'laptops',
    price: 32990000,
    stock: 50,
    stockQuantity: 50,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    description: 'Laptop Dell XPS 15 cao cấp trang bị vi xử lý Intel Core i7 thế hệ mới, màn hình OLED 3.5K sắc nét và card đồ họa chuyên dụng.'
  },
  {
    id: 2,
    name: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
    category: 'Điện thoại & Tablet',
    categoryId: 'phones',
    price: 29990000,
    stock: 100,
    stockQuantity: 100,
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
    description: 'iPhone 15 Pro Max khung Titan chuẩn hàng không vũ trụ, chip A17 Pro đỉnh cao và camera tiềm vọng zoom quang học 5x.'
  },
  {
    id: 3,
    name: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
    category: 'Phụ Kiện & Âm Thanh',
    categoryId: 'accessories',
    price: 7490000,
    stock: 200,
    stockQuantity: 200,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    description: 'Tai nghe chụp tai chống ồn hàng đầu thế giới với vi xử lý V1 + QN1 tích hợp và chất âm Hi-Res không dây trung thực.'
  },
  {
    id: 4,
    name: 'Robot Hút Bụi Lau Nhà Ecovacs Deebot X2 OMNI',
    category: 'Nhà Thông Minh & Gia Dụng',
    categoryId: 'smarthome',
    price: 18990000,
    stock: 15,
    stockQuantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80',
    description: 'Robot hút bụi lau nhà hình vuông thông minh với lực hút 8000Pa và trạm sạc giặt giẻ nước nóng tự động OMNI.'
  },
  {
    id: 5,
    name: 'Bàn phím cơ không dây Keychron K8 Pro QMK/VIA',
    category: 'Phụ Kiện & Âm Thanh',
    categoryId: 'accessories',
    price: 2450000,
    stock: 25,
    stockQuantity: 25,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    description: 'Bàn phím cơ layout TKL gõ êm ái, khung nhôm CNC, hỗ trợ Bluetooth 5.1 và Type-C tương thích đa nền tảng.'
  },
  {
    id: 6,
    name: 'MacBook Air M2 13.6 inch (16GB / 512GB SSD)',
    category: 'Laptop & Workstation',
    categoryId: 'laptops',
    price: 26500000,
    stock: 18,
    stockQuantity: 18,
    imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80',
    description: 'MacBook Air M2 thiết kế mỏng nhẹ đẳng cấp, thời lượng pin lên đến 18 giờ và màn hình Liquid Retina tuyệt đẹp.'
  },
  {
    id: 7,
    name: 'iPad Pro M4 11 inch Wi-Fi 256GB Ultra Retina XDR',
    category: 'Điện thoại & Tablet',
    categoryId: 'phones',
    price: 27490000,
    stock: 22,
    stockQuantity: 22,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80',
    description: 'iPad Pro M4 siêu mỏng 5.3mm với màn hình OLED hai lớp Ultra Retina XDR sắc nét và hiệu năng AI vượt trội.'
  },
  {
    id: 8,
    name: 'Máy lọc không khí thông minh Dyson Purifier Cool TP07',
    category: 'Nhà Thông Minh & Gia Dụng',
    categoryId: 'smarthome',
    price: 14990000,
    stock: 12,
    stockQuantity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=600&q=80',
    description: 'Máy lọc không khí kiêm quạt không cánh Dyson lọc sạch 99.95% bụi mịn PM0.1, kết nối ứng dụng MyDyson thông minh.'
  }
];

export const INITIAL_INVENTORY = [
  { id: '1', name: 'Laptop Dell XPS 15 OLED', sku: 'DELL-XPS-15', stock: 50, minThreshold: 5 },
  { id: '2', name: 'iPhone 15 Pro Max 256GB', sku: 'APPL-IP15PM', stock: 100, minThreshold: 10 },
  { id: '3', name: 'Tai nghe Sony WH-1000XM5', sku: 'SNY-WH1000XM5', stock: 200, minThreshold: 15 },
  { id: '4', name: 'Robot Hút Bụi Deebot X2 OMNI', sku: 'ECO-DEE-X2', stock: 15, minThreshold: 5 },
  { id: '5', name: 'Bàn phím cơ không dây Keychron K8 Pro', sku: 'KEY-WL-01', stock: 25, minThreshold: 10 },
  { id: '6', name: 'MacBook Air M2 13.6 inch', sku: 'APPL-MBA-M2', stock: 18, minThreshold: 5 }
];
