package com.ecommerce.chatbot.tool;

import org.springframework.stereotype.Component;

/**
 * AI Tool Calling component for Customer Support Policies:
 * - getShippingPolicy
 * - getPaymentPolicy
 * - getReturnPolicy
 * - getWarrantyPolicy
 */
@Component
public class CustomerSupportTools {

    public String getShippingPolicy() {
        return """
               🚚 **Chính sách vận chuyển ShopMart:**
               - **Miễn phí vận chuyển (Freeship):** Cho tất cả đơn hàng tiêu chuẩn trên toàn quốc hoặc áp dụng mã giảm giá vận chuyển.
               - **Thời gian giao hàng dự kiến:**
                 • Nội thành Hà Nội & TP.HCM: **1 - 2 ngày làm việc** (hỗ trợ giao hỏa tốc 2h).
                 • Các tỉnh/thành phố khác: **2 - 4 ngày làm việc**.
               - **Đồng kiểm:** Khách hàng được quyền kiểm tra ngoại quan hộp hàng và niêm phong chính hãng trước khi nhận.
               """;
    }

    public String getPaymentPolicy() {
        return """
               💳 **Chính sách & Phương thức thanh toán ShopMart:**
               - **Thanh toán khi nhận hàng (COD):** Kiểm tra hàng và thanh toán tiền mặt trực tiếp cho nhân viên giao hàng.
               - **Thanh toán trực tuyến (QR / Chuyển khoản / VNPay):** Quét mã QR ngân hàng tự động xác nhận tức thì (an toàn, bảo mật chuẩn PCI-DSS).
               - **Hóa đơn VAT:** Hỗ trợ xuất hóa đơn điện tử GTGT (VAT) tự động cho cá nhân và doanh nghiệp.
               """;
    }

    public String getReturnPolicy() {
        return """
               🔄 **Chính sách đổi trả & hoàn tiền ShopMart:**
               - **1 đổi 1 trong 30 ngày đầu:** Nếu sản phẩm phát sinh lỗi phần cứng từ nhà sản xuất.
               - **Điều kiện đổi trả:** Sản phẩm còn nguyên tem bảo hành, đầy đủ hộp, phụ kiện đi kèm và hóa đơn/mã đơn hàng trên hệ thống.
               - **Hoàn tiền nhanh:** Hoàn tiền trong vòng **24 - 48 giờ làm việc** đối với đơn hàng hủy hợp lệ hoặc sản phẩm hết hàng đổi.
               """;
    }

    public String getWarrantyPolicy() {
        return """
               🛡️ **Chính sách bảo hành chính hãng ShopMart:**
               - **Cam kết 100% hàng chính hãng:** Bảo hành tiêu chuẩn từ **12 đến 24 tháng** tại hệ thống Trung tâm Bảo hành ủy quyền chính hãng (Apple, Dell, Asus, Samsung, Sony, Logitech...).
               - **Tra cứu bảo hành:** Tra cứu trực tuyến bằng Mã đơn hàng hoặc Số Serial/IMEI của thiết bị.
               - **Hỗ trợ kỹ thuật trọn đời:** Miễn phí vệ sinh máy, cài đặt phần mềm cơ bản và chẩn đoán lỗi tại toàn bộ chi nhánh ShopMart.
               """;
    }
}

