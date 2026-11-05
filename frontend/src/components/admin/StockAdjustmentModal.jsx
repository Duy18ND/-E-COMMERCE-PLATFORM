import { useState, useEffect, useMemo } from 'react';
import useToast from '../../hooks/useToast';
import inventoryService, { getInventoryStatus, setStoredThreshold } from '../../services/inventoryService';
import Button from '../common/Button';

/**
 * [ECOM-283] Modal điều chỉnh tồn kho và cảnh báo hết hàng cho Admin
 * 
 * @param {boolean} isOpen - Trạng thái hiển thị modal
 * @param {function} onClose - Đóng modal
 * @param {object} product - Sản phẩm đang chọn điều chỉnh
 * @param {function} onSuccess - Callback sau khi cập nhật kho thành công
 */
const StockAdjustmentModal = ({ isOpen, onClose, product, onSuccess }) => {
  const { notify, confirmDialog } = useToast();

  // Mode: 'INBOUND' (Nhập thêm), 'DECREASE' (Xuất kho/giảm), 'SET_EXACT' (Kiểm kê thực tế)
  const [mode, setMode] = useState('INBOUND');
  const [quantityInput, setQuantityInput] = useState('1');
  const [reasonInput, setReasonInput] = useState('');
  const [thresholdInput, setThresholdInput] = useState('5');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đồng bộ dữ liệu khi mở modal hoặc đổi sản phẩm
  useEffect(() => {
    if (isOpen && product) {
      setMode('INBOUND');
      setQuantityInput('1');
      setReasonInput('');
      setThresholdInput(String(product.minThreshold || 5));
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, product]);

  const currentStock = Math.max(0, Math.floor(Number(product?.stockQuantity ?? product?.stock ?? 0)));
  const currentThreshold = Math.max(1, Math.floor(Number(thresholdInput) || product?.minThreshold || 5));

  // Tính toán số lượng và tồn kho dự kiến
  const previewCalculation = useMemo(() => {
    const rawVal = quantityInput.trim();
    if (!rawVal) {
      return { isValid: false, changeText: '---', projectedStock: currentStock, delta: 0 };
    }

    const numVal = Number(rawVal);
    if (!Number.isInteger(numVal)) {
      return { isValid: false, changeText: 'Không hợp lệ (phải là số nguyên)', projectedStock: currentStock, delta: 0 };
    }

    if (mode === 'INBOUND') {
      if (numVal <= 0) {
        return { isValid: false, changeText: 'Số lượng phải > 0', projectedStock: currentStock, delta: 0 };
      }
      const projected = currentStock + numVal;
      return {
        isValid: true,
        changeText: `+${numVal}`,
        delta: numVal,
        projectedStock: projected,
        statusInfo: getInventoryStatus(projected, currentThreshold)
      };
    }

    if (mode === 'DECREASE') {
      if (numVal <= 0) {
        return { isValid: false, changeText: 'Số lượng phải > 0', projectedStock: currentStock, delta: 0 };
      }
      if (numVal > currentStock) {
        return {
          isValid: false,
          changeText: `Không thể giảm vượt quá tồn kho hiện tại (${currentStock})`,
          projectedStock: currentStock - numVal,
          delta: -numVal
        };
      }
      const projected = currentStock - numVal;
      return {
        isValid: true,
        changeText: `-${numVal}`,
        delta: -numVal,
        projectedStock: projected,
        statusInfo: getInventoryStatus(projected, currentThreshold)
      };
    }

    if (mode === 'SET_EXACT') {
      if (numVal < 0) {
        return { isValid: false, changeText: 'Tồn kho không được âm', projectedStock: numVal, delta: 0 };
      }
      const delta = numVal - currentStock;
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      return {
        isValid: true,
        changeText: sign,
        delta,
        projectedStock: numVal,
        statusInfo: getInventoryStatus(numVal, currentThreshold)
      };
    }

    return { isValid: false, changeText: '---', projectedStock: currentStock, delta: 0 };
  }, [mode, quantityInput, currentStock, currentThreshold]);

  if (!isOpen || !product) return null;

  const currentStatusInfo = getInventoryStatus(currentStock, product.minThreshold || 5);

  // Validate form trước khi submit
  const validateForm = () => {
    const errs = {};
    const rawVal = quantityInput.trim();

    if (!rawVal) {
      errs.quantity = 'Vui lòng nhập số lượng.';
    } else {
      const numVal = Number(rawVal);
      if (!Number.isInteger(numVal)) {
        errs.quantity = 'Số lượng phải là số nguyên (không chứa chữ hoặc số thập phân).';
      } else if (mode === 'INBOUND' && numVal <= 0) {
        errs.quantity = 'Số lượng nhập kho phải lớn hơn 0.';
      } else if (mode === 'DECREASE') {
        if (numVal <= 0) {
          errs.quantity = 'Số lượng xuất kho phải lớn hơn 0.';
        } else if (numVal > currentStock) {
          errs.quantity = `Số lượng giảm (${numVal}) vượt quá tồn kho hiện tại (${currentStock}).`;
        }
      } else if (mode === 'SET_EXACT' && numVal < 0) {
        errs.quantity = 'Số lượng tồn kho thực tế không được âm (< 0).';
      }
    }

    // Backend yêu cầu @NotBlank cho reason trong /adjust-stock
    if ((mode === 'DECREASE' || mode === 'SET_EXACT') && !reasonInput.trim()) {
      errs.reason = 'Vui lòng nhập lý do điều chỉnh kho (bắt buộc theo quy định kiểm kê).';
    }

    const threshVal = Number(thresholdInput);
    if (!Number.isInteger(threshVal) || threshVal < 1) {
      errs.threshold = 'Ngưỡng cảnh báo phải là số nguyên >= 1.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      notify?.error('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.');
      return;
    }

    const qty = Number(quantityInput.trim());
    const reason = reasonInput.trim();
    const targetStock = previewCalculation.projectedStock;

    // Chuẩn bị nội dung xác nhận chi tiết
    let confirmTitle = 'Xác nhận điều chỉnh kho';
    let confirmMessage = '';
    let confirmVariant = 'primary';

    if (mode === 'INBOUND') {
      confirmTitle = 'Xác nhận nhập thêm hàng';
      confirmMessage = `Nhập thêm +${qty} sản phẩm vào kho cho "${product.name}". Tồn kho mới sẽ là ${targetStock} sản phẩm.`;
      confirmVariant = 'primary';
    } else if (mode === 'DECREASE') {
      confirmTitle = 'Xác nhận xuất kho / giảm hàng';
      confirmMessage = `Xuất giảm -${qty} sản phẩm khỏi kho cho "${product.name}". Lý do: "${reason}". Tồn kho mới sẽ là ${targetStock} sản phẩm.`;
      confirmVariant = targetStock === 0 ? 'danger' : 'warning';
    } else {
      confirmTitle = 'Xác nhận cập nhật kiểm kê thực tế';
      confirmMessage = `Đặt lại tồn kho của "${product.name}" thành ${targetStock} sản phẩm. Lý do: "${reason}".`;
      confirmVariant = targetStock === 0 ? 'danger' : 'primary';
    }

    // Hỏi xác nhận bằng ConfirmModal (không dùng popup mặc định của trình duyệt)
    const confirmed = await confirmDialog({
      title: confirmTitle,
      message: confirmMessage,
      variant: confirmVariant,
      confirmText: 'Xác nhận thực hiện',
      cancelText: 'Xem lại'
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      let updatedResult = null;

      if (mode === 'INBOUND') {
        updatedResult = await inventoryService.inboundStock(product.id, {
          quantity: qty,
          note: reason || 'Nhập thêm hàng từ quản trị viên'
        });
      } else if (mode === 'DECREASE') {
        updatedResult = await inventoryService.decreaseStock(product.id, {
          currentStock,
          quantity: qty,
          reason
        });
      } else {
        updatedResult = await inventoryService.adjustStock(product.id, {
          actualStock: targetStock,
          reason
        });
      }

      // Lưu ngưỡng cảnh báo nếu có thay đổi
      const parsedThresh = Math.max(1, Math.floor(Number(thresholdInput) || 5));
      if (parsedThresh !== product.minThreshold) {
        setStoredThreshold(product.id, parsedThresh);
      }

      notify?.success(`Đã cập nhật tồn kho thành công! Tồn kho hiện tại: ${targetStock} sản phẩm.`, {
        title: 'Thành công'
      });

      if (onSuccess) {
        onSuccess({
          ...product,
          ...updatedResult,
          stock: targetStock,
          stockQuantity: targetStock,
          minThreshold: parsedThresh,
          statusInfo: getInventoryStatus(targetStock, parsedThresh)
        });
      }

      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Không thể điều chỉnh kho. Vui lòng thử lại.';
      notify?.error(errMsg, { title: 'Lỗi cập nhật kho' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem'
      }}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '620px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              📦 Điều chỉnh tồn kho &amp; Cảnh báo
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Cập nhật số lượng thực tế, quản lý xuất nhập và ngưỡng cảnh báo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#94a3b8',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem' }}>
          {/* THÔNG TIN SẢN PHẨM HIỆN TẠI */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    marginBottom: '0.25rem'
                  }}
                >
                  {product.sku || `ID: ${product.id}`}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  {product.name}
                </h3>
              </div>

              {/* Status Badge hiện tại */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span
                  className={`badge ${currentStatusInfo.badgeClass}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    fontWeight: 700
                  }}
                >
                  <span>{currentStatusInfo.icon}</span>
                  <span>{currentStatusInfo.label}</span>
                </span>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>
                  Hiện có: <strong style={{ color: currentStatusInfo.color, fontSize: '1rem' }}>{currentStock}</strong> sp
                </div>
              </div>
            </div>
          </div>

          {/* CHỌN LOẠI THAO TÁC ĐIỀU CHỈNH */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
              Loại thao tác điều chỉnh kho <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => {
                  setMode('INBOUND');
                  setErrors((prev) => ({ ...prev, quantity: '', reason: '' }));
                }}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: '10px',
                  border: mode === 'INBOUND' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  backgroundColor: mode === 'INBOUND' ? '#f0fdf4' : '#ffffff',
                  color: mode === 'INBOUND' ? '#166534' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>📥</span>
                <span>Nhập thêm</span>
                <small style={{ fontSize: '0.72rem', color: '#64748b' }}>Cộng dồn (+)</small>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('DECREASE');
                  setErrors((prev) => ({ ...prev, quantity: '', reason: '' }));
                }}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: '10px',
                  border: mode === 'DECREASE' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                  backgroundColor: mode === 'DECREASE' ? '#fff7ed' : '#ffffff',
                  color: mode === 'DECREASE' ? '#9a3412' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>📤</span>
                <span>Xuất kho / Giảm</span>
                <small style={{ fontSize: '0.72rem', color: '#64748b' }}>Khấu trừ (-)</small>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('SET_EXACT');
                  setErrors((prev) => ({ ...prev, quantity: '', reason: '' }));
                }}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: '10px',
                  border: mode === 'SET_EXACT' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: mode === 'SET_EXACT' ? '#eff6ff' : '#ffffff',
                  color: mode === 'SET_EXACT' ? '#1e40af' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <span>Kiểm kê thực tế</span>
                <small style={{ fontSize: '0.72rem', color: '#64748b' }}>Đặt số chuẩn (=)</small>
              </button>
            </div>
          </div>

          {/* SỐ LƯỢNG ĐIỀU CHỈNH & NGƯỠNG CẢNH BÁO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label
                htmlFor="stock-qty-input"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}
              >
                {mode === 'INBOUND'
                  ? 'Số lượng nhập thêm (+)'
                  : mode === 'DECREASE'
                  ? 'Số lượng xuất giảm (-)'
                  : 'Số lượng tồn kho thực tế (=)'}{' '}
                <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="stock-qty-input"
                type="number"
                min={mode === 'SET_EXACT' ? '0' : '1'}
                step="1"
                disabled={isSubmitting}
                value={quantityInput}
                onChange={(e) => {
                  setQuantityInput(e.target.value);
                  if (errors.quantity) {
                    setErrors((prev) => ({ ...prev, quantity: '' }));
                  }
                }}
                placeholder={mode === 'SET_EXACT' ? 'Ví dụ: 15' : 'Ví dụ: 10'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: errors.quantity ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: 700,
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
              {errors.quantity && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 500 }}>
                  ⚠️ {errors.quantity}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="stock-threshold-input"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}
              >
                Ngưỡng cảnh báo (sp)
              </label>
              <input
                id="stock-threshold-input"
                type="number"
                min="1"
                step="1"
                disabled={isSubmitting}
                value={thresholdInput}
                onChange={(e) => {
                  setThresholdInput(e.target.value);
                  if (errors.threshold) {
                    setErrors((prev) => ({ ...prev, threshold: '' }));
                  }
                }}
                placeholder="5"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: errors.threshold ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '1rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
              {errors.threshold && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 500 }}>
                  ⚠️ {errors.threshold}
                </div>
              )}
              <small style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                Cảnh báo khi tồn kho ≤ mức này
              </small>
            </div>
          </div>

          {/* LÝ DO / GHI CHÚ */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="stock-reason-input"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}
            >
              Lý do / Ghi chú điều chỉnh{' '}
              {mode !== 'INBOUND' ? <span style={{ color: '#dc2626' }}>* (Bắt buộc)</span> : <span style={{ color: '#64748b' }}>(Tùy chọn)</span>}
            </label>
            <textarea
              id="stock-reason-input"
              rows="2"
              disabled={isSubmitting}
              value={reasonInput}
              onChange={(e) => {
                setReasonInput(e.target.value);
                if (errors.reason) {
                  setErrors((prev) => ({ ...prev, reason: '' }));
                }
              }}
              placeholder={
                mode === 'INBOUND'
                  ? 'Ví dụ: Nhập bổ sung lô hàng đợt 2 từ nhà cung cấp...'
                  : mode === 'DECREASE'
                  ? 'Ví dụ: Hàng lỗi vỡ trong quá trình vận chuyển nội bộ...'
                  : 'Ví dụ: Điều chỉnh sau biên bản kiểm kê kho định kỳ tháng 11...'
              }
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: errors.reason ? '2px solid #ef4444' : '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                backgroundColor: '#ffffff'
              }}
            />
            {errors.reason && (
              <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 500 }}>
                ⚠️ {errors.reason}
              </div>
            )}
          </div>

          {/* XEM TRƯỚC BIẾN ĐỘNG TỒN KHO (LIVE PREVIEW) */}
          <div
            style={{
              borderRadius: '12px',
              border: previewCalculation.isValid ? '1.5px solid #bbf7d0' : '1.5px dashed #cbd5e1',
              backgroundColor: previewCalculation.isValid ? '#f0fdf4' : '#f8fafc',
              padding: '1rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                👁️ Xem trước biến động tồn kho
              </span>
              {previewCalculation.isValid && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    color: previewCalculation.statusInfo.color,
                    backgroundColor: previewCalculation.statusInfo.bgLight,
                    border: `1px solid ${previewCalculation.statusInfo.border}`
                  }}
                >
                  {previewCalculation.statusInfo.icon} {previewCalculation.statusInfo.label}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto 1fr',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.5rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tồn kho cũ</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{currentStock}</div>
              </div>

              <div style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 700 }}>
                {mode === 'INBOUND' ? '+' : mode === 'DECREASE' ? '-' : '➜'}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Biến động</div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: mode === 'INBOUND' ? '#16a34a' : mode === 'DECREASE' ? '#ea580c' : '#2563eb'
                  }}
                >
                  {previewCalculation.changeText}
                </div>
              </div>

              <div style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 700 }}>=</div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tồn kho mới</div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    color: previewCalculation.isValid ? previewCalculation.statusInfo.color : '#94a3b8'
                  }}
                >
                  {previewCalculation.isValid ? `${previewCalculation.projectedStock} sp` : '---'}
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !previewCalculation.isValid}
            >
              {isSubmitting ? (
                <span>⏳ Đang xử lý...</span>
              ) : (
                <span>💾 Lưu điều chỉnh</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustmentModal;
