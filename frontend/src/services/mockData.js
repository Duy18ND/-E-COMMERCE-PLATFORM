/**
 * Dữ liệu tạm thời tách riêng cho các Module Backend CHƯA triển khai Controller:
 * - Product (Sản phẩm)
 * - Category (Danh mục)
 * - Inventory (Kho hàng)
 * 
 * Lưu ý: ID 1, 2, 3 được đồng bộ chính xác với DataSeeder.java ở Backend để khi Cart
 * gọi /api/cart/items với productId = 1, 2, 3 thì MySQL tìm thấy bản ghi.
 */

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: 'Laptop Dell XPS 15',
    category: 'Laptop',
    price: 32990000,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
    description: 'Laptop Dell XPS 15 cao cấp trang bị vi xử lý Intel Core i7 thế hệ mới, màn hình OLED 3.5K sắc nét và card đồ họa chuyên dụng.'
  },
  {
    id: 2,
    name: 'iPhone 15 Pro Max 256GB',
    category: 'Điện thoại',
    price: 29990000,
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
    description: 'iPhone 15 Pro Max khung Titan chuẩn hàng không vũ trụ, chip A17 Pro đỉnh cao và camera tiềm vọng zoom quang học 5x.'
  },
  {
    id: 3,
    name: 'Tai nghe Sony WH-1000XM5',
    category: 'Phụ kiện',
    price: 7490000,
    stock: 200,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    description: 'Tai nghe chụp tai chống ồn hàng đầu thế giới với vi xử lý V1 + QN1 tích hợp và chất âm Hi-Res không dây trung thực.'
  },
  {
    id: 4,
    name: 'Robot Hút Bụi Deebot X2 OMNI',
    category: 'Nhà thông minh',
    price: 18990000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80',
    description: 'Robot hút bụi lau nhà hình vuông thông minh với lực hút 8000Pa và trạm sạc giặt giẻ nước nóng tự động OMNI.'
  },
  {
    id: 5,
    name: 'Bàn phím cơ không dây đa kết nối',
    category: 'Phụ kiện',
    price: 1850000,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    description: 'Bàn phím cơ layout 75% gõ êm ái, hỗ trợ Bluetooth 5.1, Wireless 2.4G và Type-C tương thích đa nền tảng.'
  },
  {
    id: 6,
    name: 'MacBook Air M2 13 inch',
    category: 'Laptop',
    price: 24500000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80',
    description: 'MacBook Air M2 thiết kế mỏng nhẹ đẳng cấp, thời lượng pin lên đến 18 giờ và màn hình Liquid Retina tuyệt đẹp.'
  }
];

export const INITIAL_CATEGORIES = [
  {
    id: 'phones',
    name: 'Điện thoại & Tablet',
    description: 'iPhone, Galaxy, iPad thế hệ mới chính hãng phân phối',
    count: '1.2k+ SP',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    badgeBg: '#eff6ff',
    badgeColor: '#2563eb',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'laptops',
    name: 'Laptop & Workstation',
    description: 'MacBook, Dell XPS, ThinkPad phục vụ học tập, đồ họa, lập trình',
    count: '850+ SP',
    iconBg: '#eef2ff',
    iconColor: '#4f46e5',
    badgeBg: '#eef2ff',
    badgeColor: '#4f46e5',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'accessories',
    name: 'Phụ Kiện & Âm Thanh',
    description: 'Tai nghe hi-res, bàn phím cơ, chuột không dây và củ sạc nhanh',
    count: '3.4k+ SP',
    iconBg: '#fff7ed',
    iconColor: '#ea580c',
    badgeBg: '#fff7ed',
    badgeColor: '#ea580c',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'smarthome',
    name: 'Nhà Thông Minh & Gia Dụng',
    description: 'Robot hút bụi, máy lọc không khí và đèn thông minh tiện nghi',
    count: '920+ SP',
    iconBg: '#fff1f2',
    iconColor: '#e11d48',
    badgeBg: '#fff1f2',
    badgeColor: '#e11d48',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80'
  }
];

export const INITIAL_INVENTORY = [
  { id: '1', name: 'Laptop Dell XPS 15', sku: 'DELL-XPS-15', stock: 50, minThreshold: 5 },
  { id: '2', name: 'iPhone 15 Pro Max 256GB', sku: 'APPL-IP15PM', stock: 100, minThreshold: 10 },
  { id: '3', name: 'Tai nghe Sony WH-1000XM5', sku: 'SNY-WH1000XM5', stock: 200, minThreshold: 15 },
  { id: '4', name: 'Robot Hút Bụi Deebot X2 OMNI', sku: 'ECO-DEE-X2', stock: 15, minThreshold: 5 },
  { id: '5', name: 'Bàn phím cơ không dây', sku: 'KEY-WL-01', stock: 25, minThreshold: 10 },
  { id: '6', name: 'MacBook Air M2 13 inch', sku: 'APPL-MBA-M2', stock: 8, minThreshold: 5 }
];
