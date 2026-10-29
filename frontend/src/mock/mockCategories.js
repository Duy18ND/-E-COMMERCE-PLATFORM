/**
 * Mock Categories Data cho Admin Category Management
 * Gồm hơn 40 danh mục phong phú, chuẩn hệ thống E-commerce hiện đại
 * Phục vụ kiểm thử toàn diện: Pagination (5, 10, 20, 50), Search, Filter, CRUD
 */

export const MOCK_CATEGORIES = [
  {
    id: 'CAT001',
    name: 'Điện thoại thông minh',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80',
    description: 'Smartphone cao cấp chính hãng từ Apple, Samsung, Xiaomi và các thương hiệu hàng đầu.',
    productCount: 25,
    status: 'ACTIVE',
    createdAt: '2026-10-20'
  },
  {
    id: 'CAT002',
    name: 'Laptop & Workstation',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
    description: 'MacBook, Dell XPS, ThinkPad, laptop đồ họa và máy trạm hiệu năng cao.',
    productCount: 38,
    status: 'ACTIVE',
    createdAt: '2026-10-18'
  },
  {
    id: 'CAT003',
    name: 'Máy tính bảng & iPad',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=400&q=80',
    description: 'iPad Pro, Galaxy Tab, bút cảm ứng và phụ kiện máy tính bảng thông minh.',
    productCount: 16,
    status: 'ACTIVE',
    createdAt: '2026-10-15'
  },
  {
    id: 'CAT004',
    name: 'Tai nghe & Âm thanh Hi-Fi',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    description: 'Tai nghe chống ồn không dây, tai nghe chụp tai, loa bluetooth và DAC/Amp.',
    productCount: 42,
    status: 'ACTIVE',
    createdAt: '2026-10-12'
  },
  {
    id: 'CAT005',
    name: 'Đồng hồ thông minh & Smartwatch',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    description: 'Apple Watch, Garmin, Samsung Galaxy Watch theo dõi sức khỏe và thể thao.',
    productCount: 19,
    status: 'ACTIVE',
    createdAt: '2026-10-10'
  },
  {
    id: 'CAT006',
    name: 'Thời trang nam',
    image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=400&q=80',
    description: 'Áo sơ mi, áo khoác, quần âu, vest nam cao cấp phong cách hiện đại.',
    productCount: 54,
    status: 'ACTIVE',
    createdAt: '2026-10-08'
  },
  {
    id: 'CAT007',
    name: 'Thời trang nữ',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80',
    description: 'Váy đầm thiết kế, set đồ công sở, áo len và phụ kiện thời trang nữ.',
    productCount: 68,
    status: 'ACTIVE',
    createdAt: '2026-10-05'
  },
  {
    id: 'CAT008',
    name: 'Giày dép & Sneaker',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
    description: 'Giày thể thao sneaker, giày tây da, giày chạy bộ và sandal thời thượng.',
    productCount: 31,
    status: 'ACTIVE',
    createdAt: '2026-10-02'
  },
  {
    id: 'CAT009',
    name: 'Phụ kiện di động',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=400&q=80',
    description: 'Ốp lưng, kính cường lực, giá đỡ điện thoại và phụ kiện selfie chuyên dụng.',
    productCount: 88,
    status: 'ACTIVE',
    createdAt: '2026-09-28'
  },
  {
    id: 'CAT010',
    name: 'Đồ gia dụng thông minh',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
    description: 'Robot hút bụi, máy lọc không khí, nồi chiên không dầu và máy làm ấm thông minh.',
    productCount: 22,
    status: 'ACTIVE',
    createdAt: '2026-09-25'
  },
  {
    id: 'CAT011',
    name: 'Thiết bị Gaming',
    image: 'https://images.unsplash.com/photo-1612287232258-c215fa1d14dc?auto=format&fit=crop&w=400&q=80',
    description: 'Ghế gaming, tay cầm chơi game PS5/Xbox, máy chơi game cầm tay và vô lăng lái xe.',
    productCount: 17,
    status: 'ACTIVE',
    createdAt: '2026-09-22'
  },
  {
    id: 'CAT012',
    name: 'Linh kiện máy tính (PC Parts)',
    image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80',
    description: 'CPU Intel/AMD, Card đồ họa RTX/Radeon, Mainboard, RAM và Nguồn máy tính.',
    productCount: 45,
    status: 'ACTIVE',
    createdAt: '2026-09-18'
  },
  {
    id: 'CAT013',
    name: 'Màn hình máy tính',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80',
    description: 'Màn hình 4K đồ họa, màn hình gaming 240Hz, màn hình cong siêu rộng Ultrawide.',
    productCount: 14,
    status: 'ACTIVE',
    createdAt: '2026-09-15'
  },
  {
    id: 'CAT014',
    name: 'Thiết bị mạng & Wifi 7',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=400&q=80',
    description: 'Router Mesh Wifi 6/7, Switch mạng Gigabit, USB Wifi và thiết bị mạng doanh nghiệp.',
    productCount: 12,
    status: 'ACTIVE',
    createdAt: '2026-09-12'
  },
  {
    id: 'CAT015',
    name: 'Bàn phím cơ & Chuột công thái học',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80',
    description: 'Bàn phím cơ custom, chuột không dây siêu nhẹ và kê tay bàn phím cao cấp.',
    productCount: 36,
    status: 'ACTIVE',
    createdAt: '2026-09-09'
  },
  {
    id: 'CAT016',
    name: 'Camera an ninh & Giám sát',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80',
    description: 'Camera IP ngoài trời, camera đàm thoại 2 chiều và đầu ghi hình thông minh AI.',
    productCount: 18,
    status: 'ACTIVE',
    createdAt: '2026-09-05'
  },
  {
    id: 'CAT017',
    name: 'Máy ảnh & Ống kính chuyên nghiệp',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80',
    description: 'Máy ảnh Mirrorless Sony, Canon, Fujifilm và hệ thống ống kính quay chụp đỉnh cao.',
    productCount: 0,
    status: 'INACTIVE',
    createdAt: '2026-09-01'
  },
  {
    id: 'CAT018',
    name: 'Thiết bị văn phòng & Máy in',
    image: 'https://images.unsplash.com/photo-1589330694653-dad6d3240a2b?auto=format&fit=crop&w=400&q=80',
    description: 'Máy in laser đa năng, máy hủy tài liệu, máy scan và mực in chính hãng.',
    productCount: 9,
    status: 'ACTIVE',
    createdAt: '2026-08-28'
  },
  {
    id: 'CAT019',
    name: 'Thiết bị đeo sức khỏe & Vòng tay thông minh',
    image: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?auto=format&fit=crop&w=400&q=80',
    description: 'Smartband đo nhịp tim, nồng độ oxy SpO2 và đếm bước chân vận động chuẩn xác.',
    productCount: 11,
    status: 'ACTIVE',
    createdAt: '2026-08-25'
  },
  {
    id: 'CAT020',
    name: 'Tivi & Thiết bị giải trí tại gia',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=400&q=80',
    description: 'Smart TV OLED/QLED 4K/8K, Android TV Box và thanh soundbar rạp hát tại gia.',
    productCount: 15,
    status: 'ACTIVE',
    createdAt: '2026-08-20'
  },
  {
    id: 'CAT021',
    name: 'Tủ lạnh & Máy giặt inverter',
    image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=400&q=80',
    description: 'Tủ lạnh Side by Side, máy giặt sấy thông minh tiết kiệm điện năng.',
    productCount: 8,
    status: 'ACTIVE',
    createdAt: '2026-08-16'
  },
  {
    id: 'CAT022',
    name: 'Máy lọc không khí & Tạo ẩm',
    image: 'https://images.unsplash.com/photo-1626218174358-7769486c4b79?auto=format&fit=crop&w=400&q=80',
    description: 'Lọc bụi mịn PM2.5, khử mùi diệt khuẩn bằng ion âm cho phòng ngủ và văn phòng.',
    productCount: 13,
    status: 'ACTIVE',
    createdAt: '2026-08-12'
  },
  {
    id: 'CAT023',
    name: 'Robot hút bụi & Lau sàn tự động',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    description: 'Trạm giặt sấy giẻ tự động bằng nước nóng, điều hướng laser LiDAR thông minh.',
    productCount: 7,
    status: 'ACTIVE',
    createdAt: '2026-08-08'
  },
  {
    id: 'CAT024',
    name: 'Phụ kiện ô tô & Xe máy',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80',
    description: 'Camera hành trình 4K, tẩu sạc xe hơi, máy bơm lốp mini và cảm biến áp suất lốp.',
    productCount: 23,
    status: 'ACTIVE',
    createdAt: '2026-08-05'
  },
  {
    id: 'CAT025',
    name: 'Nước hoa & Mỹ phẩm nam nữ',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
    description: 'Nước hoa chính hãng, kem chống nắng, serum dưỡng da và bộ chăm sóc cá nhân.',
    productCount: 29,
    status: 'ACTIVE',
    createdAt: '2026-08-01'
  },
  {
    id: 'CAT026',
    name: 'Đồ chơi công nghệ & STEM',
    image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=400&q=80',
    description: 'Flycam mini, robot lập trình STEM cho trẻ em và mô hình cơ khí thông minh.',
    productCount: 0,
    status: 'INACTIVE',
    createdAt: '2026-07-28'
  },
  {
    id: 'CAT027',
    name: 'Balo, Túi chống sốc & Vali',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    description: 'Balo laptop chống nước, túi chống sốc đệm khí và vali du lịch khóa TSA an toàn.',
    productCount: 21,
    status: 'ACTIVE',
    createdAt: '2026-07-24'
  },
  {
    id: 'CAT028',
    name: 'Cáp sạc & Củ sạc nhanh GaN',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80',
    description: 'Củ sạc công nghệ GaN 65W/100W/140W đa cổng, cáp sạc Type-C bọc dù siêu bền.',
    productCount: 52,
    status: 'ACTIVE',
    createdAt: '2026-07-20'
  },
  {
    id: 'CAT029',
    name: 'Pin sạc dự phòng sạc nhanh',
    image: 'https://images.unsplash.com/photo-1609592806596-4d8b5b1e6e44?auto=format&fit=crop&w=400&q=80',
    description: 'Pin dự phòng 10.000mAh - 30.000mAh hỗ trợ sạc nhanh PD 3.0 và sạc không dây từ tính.',
    productCount: 26,
    status: 'ACTIVE',
    createdAt: '2026-07-16'
  },
  {
    id: 'CAT030',
    name: 'Ổ cứng SSD & Thẻ nhớ tốc độ cao',
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80',
    description: 'SSD NVMe Gen4/Gen5 tốc độ 7000MB/s, ổ cứng di động chống sốc và thẻ nhớ SD UHS-II.',
    productCount: 34,
    status: 'ACTIVE',
    createdAt: '2026-07-12'
  },
  {
    id: 'CAT031',
    name: 'Ghế công thái học & Bàn nâng hạ',
    image: 'https://images.unsplash.com/photo-1580481077195-c3a821a5060f?auto=format&fit=crop&w=400&q=80',
    description: 'Bàn làm việc điều chỉnh độ cao điện tử và ghế Ergonomic bảo vệ cột sống người dùng.',
    productCount: 10,
    status: 'ACTIVE',
    createdAt: '2026-07-08'
  },
  {
    id: 'CAT032',
    name: 'Máy chiếu mini & Hội nghị',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=400&q=80',
    description: 'Máy chiếu bỏ túi thông minh Android, máy chiếu độ sáng cao cho phòng họp doanh nghiệp.',
    productCount: 6,
    status: 'ACTIVE',
    createdAt: '2026-07-04'
  },
  {
    id: 'CAT033',
    name: 'Đèn bàn & Chiếu sáng thông minh',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=400&q=80',
    description: 'Đèn treo màn hình chống mỏi mắt, đèn bàn bảo vệ thị lực và dải LED RGB đồng bộ nhạc.',
    productCount: 19,
    status: 'ACTIVE',
    createdAt: '2026-06-30'
  },
  {
    id: 'CAT034',
    name: 'Microphone & Thiết bị Livestream',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80',
    description: 'Micro thu âm Podcast, sound card lọc tạp âm và capture card truyền tín hiệu full HD.',
    productCount: 15,
    status: 'ACTIVE',
    createdAt: '2026-06-25'
  },
  {
    id: 'CAT035',
    name: 'Phần mềm bản quyền & Tiện ích số',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    description: 'Windows 11 Pro, Office 365, phần mềm diệt virus và công cụ đồ họa bản quyền.',
    productCount: 0,
    status: 'INACTIVE',
    createdAt: '2026-06-20'
  },
  {
    id: 'CAT036',
    name: 'Thiết bị âm thanh ngoài trời & Loa tiệc',
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=400&q=80',
    description: 'Loa kéo karaoke bluetooth công suất lớn, chống nước IPX7 phục vụ dã ngoại và tiệc.',
    productCount: 12,
    status: 'ACTIVE',
    createdAt: '2026-06-15'
  },
  {
    id: 'CAT037',
    name: 'Máy lọc nước gia đình & Cây nước nóng lạnh',
    image: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?auto=format&fit=crop&w=400&q=80',
    description: 'Máy lọc nước RO ion kiềm hydrogen, cây nước nóng lạnh công nghệ block làm lạnh sâu.',
    productCount: 5,
    status: 'ACTIVE',
    createdAt: '2026-06-10'
  },
  {
    id: 'CAT038',
    name: 'Dụng cụ thể thao & Fitness thông minh',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
    description: 'Cân điện tử phân tích mỡ cơ thể, súng massage cơ bắp và dây kháng lực cao cấp.',
    productCount: 16,
    status: 'ACTIVE',
    createdAt: '2026-06-05'
  },
  {
    id: 'CAT039',
    name: 'Ổ cắm thông minh & Công tắc Zigbee',
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
    description: 'Công tắc cảm ứng kết nối Wifi/Zigbee, ổ cắm hẹn giờ điều khiển từ xa qua smartphone.',
    productCount: 0,
    status: 'INACTIVE',
    createdAt: '2026-06-01'
  },
  {
    id: 'CAT040',
    name: 'Sách điện tử & Thiết bị đọc E-ink',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    description: 'Máy đọc sách Kindle, Boox màn hình mực điện tử E-ink chống mỏi mắt và hỗ trợ ghi chú.',
    productCount: 7,
    status: 'ACTIVE',
    createdAt: '2026-05-25'
  },
  {
    id: 'CAT041',
    name: 'Phụ kiện du lịch & Cắm trại thông minh',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=400&q=80',
    description: 'Đèn lều năng lượng mặt trời, bộ dao đa năng dã ngoại và đệm hơi tự bơm tiện dụng.',
    productCount: 14,
    status: 'ACTIVE',
    createdAt: '2026-05-20'
  },
  {
    id: 'CAT042',
    name: 'Trạm sạc dự phòng năng lượng di động',
    image: 'https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&w=400&q=80',
    description: 'Trạm điện di động AC 220V 500W-2000W hỗ trợ sạc bằng tấm pin năng lượng mặt trời.',
    productCount: 0,
    status: 'INACTIVE',
    createdAt: '2026-05-15'
  }
];

export default MOCK_CATEGORIES;
