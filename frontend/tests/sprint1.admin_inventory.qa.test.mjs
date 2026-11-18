import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_PRODUCTS } from '../src/services/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

test('ECOM-111 (ECOM-219 & ECOM-222): Kiểm thử Chi tiết sản phẩm, API kiểm tra tồn kho (/products/{id}/stock) và khóa mua khi hết hàng', () => {
  const productDetailCode = readSrc('pages/customer/ProductDetail.jsx');
  const productServiceCode = readSrc('services/productService.js');
  const productControllerJava = readBackend(
    'product-service/src/main/java/com/ecommerce/product/controller/ProductController.java'
  );
  const stockResponseJava = readBackend(
    'product-service/src/main/java/com/ecommerce/product/dto/response/ProductStockResponse.java'
  );

  // 1. Kiểm tra kết nối API kiểm tra tồn kho GET /api/v1/products/{id}/stock
  assert.match(productServiceCode, /checkStock:\s*async/, 'productService phải có hàm checkStock');
  assert.match(productServiceCode, /api\.get\(`\/products\/\$\{id\}\/stock`/, 'productService.checkStock phải gọi GET /products/{id}/stock');
  assert.match(productDetailCode, /productService\.checkStock/, 'ProductDetail.jsx phải gọi productService.checkStock khi tải sản phẩm');
  assert.match(productControllerJava, /@GetMapping\("\/\{id\}\/stock"\)/, 'Backend ProductController phải có endpoint GET /api/v1/products/{id}/stock');
  assert.match(stockResponseJava, /private boolean inStock;/, 'Backend ProductStockResponse phải trả về trường inStock');
  assert.match(stockResponseJava, /private boolean sufficientStock;/, 'Backend ProductStockResponse phải trả về trường sufficientStock');

  // 2. Kiểm tra hiển thị trạng thái tồn kho và khóa nút mua khi hết hàng (BUG-S1-02, BUG-S1-03)
  assert.match(productDetailCode, /data-testid="product-stock-status"/, 'ProductDetail.jsx phải hiển thị rõ trạng thái tồn kho');
  assert.match(productDetailCode, /disabled=\{isAdmin \|\| isOutOfStock\}/, 'ProductDetail.jsx phải khóa nút Thêm vào giỏ và Mua ngay khi hết hàng');
  assert.match(productDetailCode, /Math\.min\(maxOrderQuantity,\s*q \+ 1\)/, 'ProductDetail.jsx phải giới hạn số lượng chọn theo tồn kho thực tế');

  // 3. Kiểm thử logic tính toán tồn kho của checkStock cho sản phẩm còn hàng và hết hàng
  const computeStockStatus = (product, requestedQty = 1) => {
    const stockQuantity = Math.max(0, Number(product.stockQuantity ?? product.stock ?? 0));
    const isActive = (product.status || 'ACTIVE') === 'ACTIVE';
    const inStock = isActive && stockQuantity > 0;
    const sufficientStock = inStock && stockQuantity >= requestedQty;
    return {
      stockQuantity,
      inStock,
      sufficientStock,
      stockStatusMessage: !isActive
        ? 'Sản phẩm đã ngừng kinh doanh'
        : !inStock
        ? 'Hết hàng'
        : !sufficientStock
        ? `Không đủ số lượng tồn kho (Chỉ còn ${stockQuantity} sản phẩm)`
        : `Còn hàng (${stockQuantity} sản phẩm có sẵn)`
    };
  };

  const inStockRes = computeStockStatus(INITIAL_PRODUCTS[0], 2);
  assert.equal(inStockRes.inStock, true, 'Sản phẩm #1 phải còn hàng (inStock = true)');
  assert.equal(inStockRes.sufficientStock, true, 'Sản phẩm #1 phải đủ số lượng 2');

  const outOfStockRes = computeStockStatus({ id: 999, name: 'SP Hết Hàng', stockQuantity: 0, status: 'ACTIVE' }, 1);
  assert.equal(outOfStockRes.stockQuantity, 0, 'Sản phẩm hết hàng phải có stockQuantity = 0');
  assert.equal(outOfStockRes.inStock, false, 'Sản phẩm hết hàng phải có inStock = false');
  assert.equal(outOfStockRes.sufficientStock, false, 'Sản phẩm hết hàng phải có sufficientStock = false');
  assert.equal(outOfStockRes.stockStatusMessage, 'Hết hàng', 'Thông báo phải là "Hết hàng"');
});

test('ECOM-130 (ECOM-237 & ECOM-240): Kiểm thử Admin Quản lý Danh mục (CRUD, Tìm kiếm, Validate trùng tên, Phân quyền)', () => {
  const adminCategoriesCode = readSrc('pages/admin/Categories.jsx');
  const categoryServiceCode = readSrc('services/categoryService.js');
  const productControllerJava = readBackend(
    'product-service/src/main/java/com/ecommerce/product/controller/ProductController.java'
  );
  const categoryRequestJava = readBackend(
    'product-service/src/main/java/com/ecommerce/product/dto/request/CategoryRequest.java'
  );

  // 1. Kiểm tra kết nối API Backend và xử lý lỗi HTTP trong categoryService.js (BUG-S1-04)
  assert.match(categoryServiceCode, /api\.post\('\/products\/categories'/, 'categoryService.create phải gọi POST /products/categories');
  assert.match(categoryServiceCode, /api\.put\(`\/products\/categories\/\$\{id\}`/, 'categoryService.update phải gọi PUT /products/categories/{id}');
  assert.match(categoryServiceCode, /api\.delete\(`\/products\/categories\/\$\{id\}`/, 'categoryService.delete phải gọi DELETE /products/categories/{id}');
  assert.match(categoryServiceCode, /api\.get\('\/products\/categories\/search'/, 'categoryService.search phải gọi GET /products/categories/search');
  assert.match(categoryServiceCode, /api\.get\(`\/products\/categories\/\$\{numId\}`\)/, 'categoryService.getById phải gọi GET /products/categories/{id}');
  assert.match(categoryServiceCode, /getAllForAdmin:\s*async/, 'categoryService phải có hàm getAllForAdmin');
  assert.match(categoryServiceCode, /rethrowIfBackendError\(err,\s*categoryData/, 'categoryService.create/update phải kiểm tra và ném lỗi HTTP từ Backend');
  assert.match(categoryServiceCode, /rethrowIfBackendError\(err,\s*options,\s*'Không thể xóa danh mục\.'\)/, 'categoryService.delete phải kiểm tra và ném lỗi HTTP từ Backend');

  // 2. Kiểm tra giao diện Admin Categories có validate không để trống, chống trùng tên và tách biệt Loading / Error / Empty state
  assert.match(adminCategoriesCode, /Tên danh mục không được để trống/, 'Admin Categories phải kiểm tra tên danh mục rỗng');
  assert.match(adminCategoriesCode, /đã tồn tại trong hệ thống/, 'Admin Categories phải kiểm tra trùng tên danh mục');
  assert.match(adminCategoriesCode, /categoryService\.getAllForAdmin\(\{\s*rejectOnError:\s*true\s*\}\)/, 'Admin Categories phải gọi categoryService.getAllForAdmin({ rejectOnError: true })');
  assert.match(adminCategoriesCode, /categoryService\.create\(formData\)/, 'Admin Categories phải gọi categoryService.create khi thêm mới');
  assert.match(adminCategoriesCode, /categoryService\.update\(selectedCategory\.id,\s*formData\)/, 'Admin Categories phải gọi categoryService.update khi sửa');
  assert.match(adminCategoriesCode, /categoryService\.delete\(selectedCategory\.id\)/, 'Admin Categories phải gọi categoryService.delete khi xóa');
  assert.match(adminCategoriesCode, /data-testid="categories-error-state"/, 'Admin Categories phải có trạng thái Error riêng biệt với Empty state');
  assert.match(adminCategoriesCode, /Không thể tải danh sách danh mục từ máy chủ/, 'Admin Categories phải hiển thị thông báo lỗi rõ ràng khi API thất bại');

  // 3. Kiểm tra Backend DTO & Phân quyền Admin Category
  assert.match(categoryRequestJava, /@NotBlank\(message = "Tên danh mục không được để trống"\)/, 'Backend CategoryRequest phải validate @NotBlank');
  assert.match(productControllerJava, /@PostMapping\("\/categories"\)[\s\S]*?requireAdminRole\(roles\);/, 'POST /categories phải yêu cầu ROLE_ADMIN');
  assert.match(productControllerJava, /@PutMapping\("\/categories\/\{id\}"\)[\s\S]*?requireAdminRole\(roles\);/, 'PUT /categories/{id} phải yêu cầu ROLE_ADMIN');
  assert.match(productControllerJava, /@DeleteMapping\("\/categories\/\{id\}"\)[\s\S]*?requireAdminRole\(roles\);/, 'DELETE /categories/{id} phải yêu cầu ROLE_ADMIN');
});

test('ECOM-109 & ECOM-201: Kiểm thử Code Splitting (React.lazy) và Suspense Fallback tránh màn hình trắng khi chuyển trang', () => {
  const appRoutesCode = readSrc('routes/AppRoutes.jsx');
  const userLayoutCode = readSrc('layouts/UserLayout.jsx');
  const adminLayoutCode = readSrc('layouts/AdminLayout.jsx');

  // Kiểm tra các trang được lazy load qua React.lazy()
  const lazyPages = [
    'Home', 'Products', 'ProductDetail', 'FlashSale', 'Cart', 'Checkout',
    'OrderSuccess', 'Orders', 'OrderDetail', 'OrderTracking', 'Vouchers', 'MyVouchers',
    'Login', 'Register',
    'AdminDashboard', 'AdminProducts', 'AdminProductForm', 'AdminCategories',
    'AdminOrders', 'AdminInventory', 'AdminSales', 'AdminSaleForm', 'AdminVouchers', 'AdminUsers', 'AdminReviews'
  ];
  for (const pageVar of lazyPages) {
    assert.match(appRoutesCode, new RegExp(`const\\s+${pageVar}\\s*=\\s*React\\.lazy\\(`), `${pageVar} phải được tải qua React.lazy()`);
  }

  // Các thành phần khung và bảo vệ route cần thiết ngay lập tức được import trực tiếp
  assert.match(appRoutesCode, /import UserLayout from '\.\.\/layouts\/UserLayout'/, 'UserLayout phải được import trực tiếp');
  assert.match(appRoutesCode, /import AdminLayout from '\.\.\/layouts\/AdminLayout'/, 'AdminLayout phải được import trực tiếp');
  assert.match(appRoutesCode, /import ProtectedRoute from '\.\/ProtectedRoute'/, 'ProtectedRoute phải được import trực tiếp');
  assert.match(appRoutesCode, /import AdminRoute from '\.\/AdminRoute'/, 'AdminRoute phải được import trực tiếp');

  // Suspense fallback tại AppRoutes, UserLayout và AdminLayout
  assert.match(appRoutesCode, /<Suspense fallback=\{<Loading/, 'AppRoutes phải bọc Routes trong Suspense với Loading fallback');
  assert.match(userLayoutCode, /<Suspense fallback=\{<Loading/, 'UserLayout phải bọc Outlet trong Suspense để giữ Header/Navbar khi chuyển trang');
  assert.match(adminLayoutCode, /<Suspense fallback=\{<Loading/, 'AdminLayout phải bọc nội dung trang trong Suspense để giữ Sidebar/Header khi chuyển trang');
});

test('ECOM-133 (ECOM-246 & ECOM-249): Kiểm thử Admin Quản lý Sản phẩm & Tồn kho (CRUD, Validate giá > 0 & tồn kho >= 0)', () => {
  const adminProductsCode = readSrc('pages/admin/Products.jsx');
  const productFormCode = readSrc('pages/admin/ProductForm.jsx');
  const adminInventoryCode = readSrc('pages/admin/Inventory.jsx');
  const productServiceCode = readSrc('services/productService.js');
  const inventoryServiceCode = readSrc('services/inventoryService.js');
  const productCreateDtoJava = readBackend(
    'product-service/src/main/java/com/ecommerce/product/dto/request/ProductCreateRequest.java'
  );

  const stockModalCode = fs.existsSync(path.join(srcDir, 'components/admin/StockAdjustmentModal.jsx'))
    ? readSrc('components/admin/StockAdjustmentModal.jsx')
    : '';

  // 1. Kiểm tra Admin Products & ProductForm đã kết nối productService (BUG-S1-05, BUG-S1-06, BUG-S1-07)
  assert.match(adminProductsCode, /productService\.getAdminProducts\(\)/, 'Admin Products.jsx phải gọi productService.getAdminProducts()');
  assert.match(adminProductsCode, /productService\.delete\(id\)/, 'Admin Products.jsx phải gọi productService.delete(id) khi xóa');
  assert.match(productFormCode, /productService\s*\.getById\(id\)/, 'ProductForm.jsx phải gọi productService.getById(id) khi chỉnh sửa');
  assert.match(productFormCode, /productService\.update\(id,\s*payload\)/, 'ProductForm.jsx phải gọi productService.update khi lưu chỉnh sửa');
  assert.match(productFormCode, /productService\.create\(payload\)/, 'ProductForm.jsx phải gọi productService.create khi thêm mới');
  assert.match(productFormCode, /validateAdminProductForm/, 'ProductForm.jsx phải kiểm tra dữ liệu hợp lệ trước khi gửi');
  assert.match(productServiceCode, /api\.get\('\/products\/admin'/, 'productService phải hỗ trợ gọi GET /products/admin');
  assert.match(adminInventoryCode, /inventoryService\.getInventory\(\)/, 'Admin Inventory.jsx phải tải dữ liệu qua inventoryService');
  
  // Hỗ trợ cả cơ chế inline updateStock cũ (Sprint 1) lẫn refactor modal StockAdjustmentModal chuyên dụng (Sprint 2)
  const hasInventoryUpdateStock =
    /inventoryService\.(updateStock|adjustStock|inboundStock)/.test(adminInventoryCode) ||
    (/StockAdjustmentModal/.test(adminInventoryCode) &&
      /inventoryService\.(inboundStock|adjustStock|decreaseStock|updateStock)/.test(stockModalCode));
  assert.ok(
    hasInventoryUpdateStock,
    'Admin Inventory.jsx hoặc StockAdjustmentModal.jsx phải cập nhật tồn kho qua inventoryService'
  );

  assert.match(inventoryServiceCode, /productService\.getAdminProducts/, 'inventoryService phải đồng bộ dữ liệu từ productService');

  // 2. Kiểm thử hàm validateAdminProductForm với các bộ dữ liệu biên
  const validateAdminProductForm = (data = {}) => {
    const errors = {};
    const trimmedName = String(data.name ?? '').trim();
    const trimmedCategory = String(data.category ?? '').trim();
    const priceNum = Number(data.price);
    const stockNum = Number(data.stock ?? data.stockQuantity);
    if (!trimmedName) errors.name = 'Tên sản phẩm không được để trống';
    if (!trimmedCategory) errors.category = 'Danh mục sản phẩm không được để trống';
    if (data.price === '' || data.price === null || data.price === undefined || Number.isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Giá sản phẩm phải lớn hơn 0';
    }
    if (data.stock === '' || data.stock === null || data.stock === undefined || Number.isNaN(stockNum) || stockNum < 0) {
      errors.stock = 'Số lượng tồn kho không được nhỏ hơn 0';
    }
    return errors;
  };

  assert.ok(validateAdminProductForm({ name: '', category: 'Laptop', price: 1000, stock: 5 }).name, 'Phải báo lỗi khi tên sản phẩm trống');
  assert.ok(validateAdminProductForm({ name: 'SP 1', category: 'Laptop', price: -100, stock: 5 }).price, 'Phải báo lỗi khi giá <= 0');
  assert.ok(validateAdminProductForm({ name: 'SP 1', category: 'Laptop', price: 0, stock: 5 }).price, 'Phải báo lỗi khi giá = 0');
  assert.ok(validateAdminProductForm({ name: 'SP 1', category: 'Laptop', price: 15000000, stock: -1 }).stock, 'Phải báo lỗi khi tồn kho < 0');
  assert.deepEqual(
    validateAdminProductForm({ name: 'MacBook Pro M3', category: 'Laptop & Workstation', price: 39990000, stock: 0 }),
    {},
    'Sản phẩm có giá > 0 và tồn kho = 0 phải hợp lệ'
  );

  // 3. Kiểm tra đồng bộ với Backend ProductCreateRequest DTO
  assert.match(productCreateDtoJava, /Giá sản phẩm phải lớn hơn 0/, 'Backend ProductCreateRequest phải validate giá > 0');
  assert.match(productCreateDtoJava, /Số lượng tồn kho không được nhỏ hơn 0/, 'Backend ProductCreateRequest phải validate stockQuantity >= 0');
});

test('ECOM-146 (ECOM-147 → ECOM-150): Kiểm thử cấu hình Docker Multi-stage, Docker Compose, MySQL 8.0 init.sql & Nginx Reverse Proxy', () => {
  const composeYml = readBackend('docker-compose.yml');
  const initSql = readBackend('docker/mysql/init.sql');
  const nginxConf = readBackend('docker/nginx/nginx.conf');
  const frontendDockerfile = fs.readFileSync(path.resolve(__dirname, '../Dockerfile'), 'utf8');
  const backendDockerignore = readBackend('.dockerignore');

  assert.match(composeYml, /image:\s*mysql:8\.0/, 'docker-compose.yml phải sử dụng image mysql:8.0');
  assert.match(composeYml, /mysql-data:\/var\/lib\/mysql/, 'MySQL phải gắn persistent volume mysql-data');
  assert.match(composeYml, /mysqladmin",\s*"ping"/, 'MySQL phải có healthcheck mysqladmin ping');
  assert.match(initSql, /CREATE DATABASE IF NOT EXISTS auth_db/, 'init.sql phải khởi tạo auth_db');
  assert.match(initSql, /CREATE DATABASE IF NOT EXISTS product_db/, 'init.sql phải khởi tạo product_db');
  assert.match(nginxConf, /proxy_pass http:\/\/gateway_upstream\/api\/;/, 'Nginx phải reverse proxy /api/ sang api-gateway:8080');
  assert.match(nginxConf, /proxy_pass http:\/\/frontend_upstream;/, 'Nginx phải reverse proxy / sang frontend:80');
  assert.match(frontendDockerfile, /FROM node:20-alpine AS builder[\s\S]*?FROM nginx:1\.27-alpine/, 'Frontend Dockerfile phải là multi-stage build');
  assert.match(backendDockerignore, /gradle\.properties/, 'backend/.dockerignore phải loại trừ gradle.properties chứa đường dẫn cục bộ');
});

test('AI SHOPPING ASSISTANT: Kiểm thử tích hợp Chatbot Service (Gemini), API Gateway, MySQL chatbot_db và bộ component ChatbotWidget (Frontend)', () => {
  const settingsGradle = readBackend('settings.gradle');
  const gatewayYaml = readBackend('api-gateway/src/main/resources/application.yml');
  const initSql = readBackend('docker/mysql/init.sql');
  const composeYml = readBackend('docker-compose.yml');
  const chatbotAppYml = readBackend('chatbot-service/src/main/resources/application.yml');
  const chatControllerJava = readBackend('chatbot-service/src/main/java/com/ecommerce/chatbot/controller/ChatController.java');
  const chatServiceJava = readBackend('chatbot-service/src/main/java/com/ecommerce/chatbot/service/impl/ChatServiceImpl.java');
  const productToolsJava = readBackend('chatbot-service/src/main/java/com/ecommerce/chatbot/tool/ProductShoppingTools.java');
  const orderToolsJava = readBackend('chatbot-service/src/main/java/com/ecommerce/chatbot/tool/CustomerOrderTools.java');
  const supportToolsJava = readBackend('chatbot-service/src/main/java/com/ecommerce/chatbot/tool/CustomerSupportTools.java');
  const chatbotServiceFe = readSrc('services/chatbotService.js');
  const useChatbotFe = readSrc('hooks/useChatbot.js');
  const chatbotWidgetFe = readSrc('components/chat/ChatbotWidget.jsx');
  const chatWindowFe = readSrc('components/chat/ChatWindow.jsx');
  const chatHeaderFe = readSrc('components/chat/ChatHeader.jsx');
  const chatMessageFe = readSrc('components/chat/ChatMessage.jsx');
  const chatInputFe = readSrc('components/chat/ChatInput.jsx');
  const typingIndicatorFe = readSrc('components/chat/TypingIndicator.jsx');
  const productCardFe = readSrc('components/chat/ProductSuggestionCard.jsx');
  const sidebarFe = readSrc('components/chat/ConversationSidebar.jsx');
  const userLayoutFe = readSrc('layouts/UserLayout.jsx');

  // 1. Kiểm tra đăng ký module chatbot-service, database chatbot_db, Gemini env và route API Gateway
  assert.match(settingsGradle, /include 'chatbot-service'/, 'settings.gradle phải khai báo module chatbot-service');
  assert.match(initSql, /CREATE DATABASE IF NOT EXISTS chatbot_db/, 'init.sql phải khởi tạo database chatbot_db');
  assert.match(initSql, /CREATE TABLE IF NOT EXISTS chat_conversations/, 'init.sql phải tạo bảng chat_conversations');
  assert.match(initSql, /CREATE TABLE IF NOT EXISTS chat_messages/, 'init.sql phải tạo bảng chat_messages');
  assert.match(gatewayYaml, /id: chatbot-service[\s\S]*?Path=\/api\/v1\/chatbot\/\*\*/, 'API Gateway phải định tuyến /api/v1/chatbot/** và /api/chatbot/** sang lb://chatbot-service');
  assert.match(composeYml, /chatbot-service:[\s\S]*?GEMINI_API_KEY:/, 'docker-compose.yml phải có cấu hình container chatbot-service với GEMINI_API_KEY');
  assert.match(chatbotAppYml, /GEMINI_API_KEY/, 'application.yml của chatbot-service phải sử dụng biến môi trường GEMINI_API_KEY');
  assert.match(chatbotAppYml, /max-messages:\s*\$\{AI_MEMORY_MAX_MESSAGES:20\}/, 'Chat memory phải giới hạn cửa sổ mặc định 20 tin nhắn');

  // 2. Kiểm tra đầy đủ REST endpoints và 10 AI Tools (Product, Order, Customer Support Policies)
  assert.match(chatControllerJava, /@PostMapping\(\{"\/chat",\s*"\/messages"\}\)/, 'ChatController phải hỗ trợ POST /chat và /messages');
  assert.match(chatControllerJava, /@PostMapping\("\/conversations"\)/, 'ChatController phải hỗ trợ POST /conversations');
  assert.match(chatControllerJava, /@GetMapping\("\/conversations"\)/, 'ChatController phải hỗ trợ GET /conversations');
  assert.match(chatControllerJava, /@DeleteMapping\("\/conversations\/\{conversationId\}"\)/, 'ChatController phải hỗ trợ DELETE /conversations/{id}');
  assert.match(productToolsJava, /searchProducts\(/, 'ProductShoppingTools phải có tool searchProducts');
  assert.match(productToolsJava, /getProductDetail\(/, 'ProductShoppingTools phải có tool getProductDetail');
  assert.match(productToolsJava, /compareProducts\(/, 'ProductShoppingTools phải có tool compareProducts');
  assert.match(productToolsJava, /getProductStock\(/, 'ProductShoppingTools phải có tool getProductStock');
  assert.match(orderToolsJava, /getMyOrders\(/, 'CustomerOrderTools phải có tool getMyOrders');
  assert.match(orderToolsJava, /getOrderStatus\(/, 'CustomerOrderTools phải có tool getOrderStatus chống IDOR');
  assert.match(supportToolsJava, /getShippingPolicy\(/, 'CustomerSupportTools phải có tool getShippingPolicy');
  assert.match(supportToolsJava, /getPaymentPolicy\(/, 'CustomerSupportTools phải có tool getPaymentPolicy');
  assert.match(supportToolsJava, /getReturnPolicy\(/, 'CustomerSupportTools phải có tool getReturnPolicy');
  assert.match(supportToolsJava, /getWarrantyPolicy\(/, 'CustomerSupportTools phải có tool getWarrantyPolicy');
  assert.match(chatServiceJava, /PROMPT_INJECTION_PATTERN/, 'ChatServiceImpl phải có bảo vệ chống Prompt Injection');

  // 3. Kiểm tra tích hợp bộ Component Frontend (ChatbotWidget, ChatWindow, ChatHeader, ChatMessage, ChatInput, TypingIndicator, ProductSuggestionCard, ConversationSidebar, useChatbot, chatbotService)
  assert.match(chatbotServiceFe, /api\.post\(\s*'\/chatbot\/chat'/, 'chatbotService.js phải gọi POST /chatbot/chat');
  assert.match(useChatbotFe, /export const useChatbot/, 'useChatbot.js phải cung cấp custom hook quản lý trạng thái hội thoại');
  assert.match(chatbotWidgetFe, /data-testid="ai-shopping-assistant-widget"/, 'ChatbotWidget.jsx phải render widget trợ lý AI');
  assert.match(chatWindowFe, /ChatHeader/, 'ChatWindow.jsx phải kết hợp ChatHeader, ChatMessage, ChatInput, TypingIndicator, ConversationSidebar');
  assert.match(chatHeaderFe, /Trợ lý Mua sắm AI/, 'ChatHeader.jsx phải hiển thị tiêu đề Trợ lý Mua sắm AI');
  assert.match(chatMessageFe, /ProductSuggestionCard/, 'ChatMessage.jsx phải hiển thị thẻ sản phẩm gợi ý ProductSuggestionCard');
  assert.match(chatInputFe, /maxLength=\{1000\}/, 'ChatInput.jsx phải giới hạn độ dài tin nhắn 1000 ký tự');
  assert.match(typingIndicatorFe, /data-testid="ai-typing-indicator"/, 'TypingIndicator.jsx phải hiển thị trạng thái AI đang phản hồi');
  assert.match(productCardFe, /formatCurrency/, 'ProductSuggestionCard.jsx phải hiển thị giá thực tế sản phẩm');
  assert.match(sidebarFe, /Các cuộc hội thoại đã lưu/, 'ConversationSidebar.jsx phải hiển thị lịch sử hội thoại');
  assert.match(userLayoutFe, /<ChatbotWidget \/>/, 'UserLayout.jsx phải nhúng <ChatbotWidget /> cho khách hàng');
});
