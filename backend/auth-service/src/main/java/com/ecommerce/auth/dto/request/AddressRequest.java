package com.ecommerce.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO ð? t?o m?i ho?c c?p nh?t m?t ð?a ch? trong s? ð?a ch?.
 */
@Getter
@Setter
public class AddressRequest {

    @NotBlank(message = "Tên ngý?i nh?n không ðý?c ð? tr?ng")
    @Size(max = 150, message = "Tên ngý?i nh?n t?i ða 150 k? t?")
    private String receiverName;

    @NotBlank(message = "S? ði?n tho?i không ðý?c ð? tr?ng")
    @Pattern(regexp = "^(\\+84|0)[3-9]\\d{8}$", message = "S? ði?n tho?i không h?p l?")
    private String phone;

    @NotBlank(message = "Ð?a ch? không ðý?c ð? tr?ng")
    @Size(max = 255, message = "Ð?a ch? t?i ða 255 k? t?")
    private String addressLine;

    @NotBlank(message = "T?nh/Thành ph? không ðý?c ð? tr?ng")
    @Size(max = 100, message = "Tên t?nh/thành t?i ða 100 k? t?")
    private String city;

    @Size(max = 100, message = "Tên qu?n/huy?n t?i ða 100 k? t?")
    private String district;

    @Size(max = 100, message = "Tên phý?ng/x? t?i ða 100 k? t?")
    private String ward;

    private Boolean isDefault = false;
}
