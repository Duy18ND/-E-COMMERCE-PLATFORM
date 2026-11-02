import { useState, useEffect, useMemo, useCallback } from 'react';
import voucherService, { getVoucherStatus } from '../../services/voucherService';
import useToast from '../../hooks/useToast';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Pagination from '../../components/admin/Pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  code: '',
  name: '',
  description: '',
  discountType: 'FIXED',
  discountValue: '',
  maxDiscount: '',
  minOrderValue: '',
  quantity: '',
  startDate: today(),
  endDate: '',
  status: 'ACTIVE'
});

const fmtMoney = (n) =>
  n != null && n !== '' ? Number(n).toLocaleString('vi-VN') + 'đ' : '—';

const fmtDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return isNaN(d) ? str : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const STATUS_DISPLAY = {
  ACTIVE: { label: 'Đang hoạt động', color: '#16a34a', bg: '#dcfce7' },
  INACTIVE: { label: 'Tạm dừng', color: '#64748b', bg: '#f1f5f9' },
  EXPIRED: { label: 'Đã hết hạn', color: '#dc2626', bg: '#fef2f2' },
  UPCOMING: { label: 'Sắp diễn ra', color: '#d97706', bg: '#fef3c7' },
  SOLD_OUT: { label: 'Đã hết lượt', color: '#7c3aed', bg: '#ede9fe' }
};

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (form, allVouchers, editId = null) => {
  const errors = {};
  if (!form.code.trim()) errors.code = 'Mã voucher không được để trống.';
  else {
    const dup = allVouchers.find(
      (v) =>
        v.id !== editId &&
        v.code.toUpperCase() === form.code.toUpperCase().trim()
    );
    if (dup) errors.code = `Mã "${form.code.trim()}" đã tồn tại.`;
  }
  if (!form.name.trim()) errors.name = 'Tên chương trình không được để trống.';
  const val = Number(form.discountValue);
  if (!form.discountValue || isNaN(val) || val <= 0)
    errors.discountValue = 'Giá trị giảm phải lớn hơn 0.';
  if (form.discountType === 'PERCENT' && val > 100)
    errors.discountValue = 'Phần trăm giảm không được vượt quá 100%.';
  if (form.minOrderValue !== '' && Number(form.minOrderValue) < 0)
    errors.minOrderValue = 'Đơn tối thiểu không được âm.';
  const qty = Number(form.quantity);
  if (!form.quantity || isNaN(qty) || qty <= 0)
    errors.quantity = 'Số lượng mã phải lớn hơn 0.';
  if (!form.startDate) errors.startDate = 'Vui lòng chọn ngày bắt đầu.';
  if (!form.endDate) errors.endDate = 'Vui lòng chọn ngày kết thúc.';
  if (form.startDate && form.endDate && form.endDate < form.startDate)
    errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu.';
  return errors;
};

// ─── Component ────────────────────────────────────────────────────────────────
const AdminVouchers = () => {
  const { showToast } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Form
  const [formData, setFormData] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});

  // Filter / search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Load ──────────────────────────────────────────────────────────────────
  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await voucherService.getAll();
      setVouchers(data);
    } catch (err) {
      showToast({ type: 'error', title: 'Lỗi', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  // ─── Filtered + Paginated ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      const s = getVoucherStatus(v);
      const matchSearch =
        !searchTerm ||
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s === statusFilter || v.status === statusFilter;
      const matchType = typeFilter === 'ALL' || v.discountType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [vouchers, searchTerm, statusFilter, typeFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormData(emptyForm());
    setFormErrors({});
    setIsAddOpen(true);
  };

  const openEdit = (v) => {
    setSelected(v);
    setFormData({
      code: v.code,
      name: v.name,
      description: v.description || '',
      discountType: v.discountType,
      discountValue: String(v.discountValue),
      maxDiscount: v.maxDiscount != null ? String(v.maxDiscount) : '',
      minOrderValue: v.minOrderValue != null ? String(v.minOrderValue) : '',
      quantity: String(v.quantity),
      startDate: v.startDate,
      endDate: v.endDate,
      status: v.status
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const openDetail = (v) => { setSelected(v); setIsDetailOpen(true); };
  const openDelete = (v) => { setSelected(v); setIsDeleteOpen(true); };

  const handleField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    const errors = validate(formData, vouchers);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    try {
      await voucherService.create({
        ...formData,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount !== '' ? Number(formData.maxDiscount) : null,
        minOrderValue: formData.minOrderValue !== '' ? Number(formData.minOrderValue) : 0,
        quantity: Number(formData.quantity)
      });
      await loadVouchers();
      setIsAddOpen(false);
      setCurrentPage(1);
      showToast({ type: 'success', title: 'Thành công', message: 'Đã thêm mã giảm giá mới.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    const errors = validate(formData, vouchers, selected?.id);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    try {
      await voucherService.update(selected.id, {
        ...formData,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount !== '' ? Number(formData.maxDiscount) : null,
        minOrderValue: formData.minOrderValue !== '' ? Number(formData.minOrderValue) : 0,
        quantity: Number(formData.quantity),
        usedQuantity: selected.usedQuantity
      });
      await loadVouchers();
      setIsEditOpen(false);
      showToast({ type: 'success', title: 'Thành công', message: 'Đã cập nhật mã giảm giá.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  const handleDelete = async () => {
    try {
      await voucherService.delete(selected.id);
      await loadVouchers();
      setIsDeleteOpen(false);
      showToast({ type: 'success', title: 'Đã xóa', message: `Đã xóa mã "${selected.code}".` });
    } catch (err) {
      showToast({ type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  const handleToggle = async (v) => {
    try {
      const updated = await voucherService.toggleStatus(v.id);
      setVouchers((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
      showToast({
        type: 'success', title: 'Đã cập nhật',
        message: `Mã "${v.code}" đã ${updated.status === 'ACTIVE' ? 'bật' : 'tắt'}.`
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: vouchers.length,
    active: vouchers.filter((v) => getVoucherStatus(v) === 'ACTIVE').length,
    expired: vouchers.filter((v) => ['EXPIRED', 'SOLD_OUT'].includes(getVoucherStatus(v))).length,
    inactive: vouchers.filter((v) => v.status === 'INACTIVE').length
  }), [vouchers]);

  // ─── Form section (shared Add/Edit) ───────────────────────────────────────
  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit}>
      {/* Row 1: Mã + Tên */}
      <div className="form-grid-2" style={{ marginBottom: '0.85rem' }}>
        <div>
          <Input
            label="Mã voucher *"
            value={formData.code}
            onChange={(e) => handleField('code', e.target.value.toUpperCase())}
            placeholder="VD: GIAM50K"
            error={formErrors.code}
          />
        </div>
        <div>
          <Input
            label="Tên chương trình *"
            value={formData.name}
            onChange={(e) => handleField('name', e.target.value)}
            placeholder="VD: Giảm 50K cho đơn từ 300K"
            error={formErrors.name}
          />
        </div>
      </div>

      {/* Mô tả */}
      <div style={{ marginBottom: '0.85rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.3rem', color: '#334155' }}>
          Mô tả
        </label>
        <textarea
          rows={2}
          value={formData.description}
          onChange={(e) => handleField('description', e.target.value)}
          placeholder="Mô tả điều kiện áp dụng..."
          style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      {/* Row 2: Loại + Giá trị + Giảm tối đa */}
      <div className="form-grid-3" style={{ marginBottom: '0.85rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.3rem', color: '#334155' }}>
            Loại giảm *
          </label>
          <select
            value={formData.discountType}
            onChange={(e) => handleField('discountType', e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="FIXED">💰 Giảm tiền cố định</option>
            <option value="PERCENT">% Giảm theo phần trăm</option>
          </select>
        </div>
        <div>
          <Input
            label={`Giá trị giảm ${formData.discountType === 'PERCENT' ? '(%)' : '(đ)'} *`}
            type="number"
            value={formData.discountValue}
            onChange={(e) => handleField('discountValue', e.target.value)}
            placeholder={formData.discountType === 'PERCENT' ? 'VD: 10' : 'VD: 50000'}
            error={formErrors.discountValue}
          />
        </div>
        <div>
          <Input
            label="Giảm tối đa (đ)"
            type="number"
            value={formData.maxDiscount}
            onChange={(e) => handleField('maxDiscount', e.target.value)}
            placeholder="Không giới hạn"
          />
        </div>
      </div>

      {/* Row 3: Đơn tối thiểu + Số lượng */}
      <div className="form-grid-2" style={{ marginBottom: '0.85rem' }}>
        <div>
          <Input
            label="Đơn tối thiểu (đ)"
            type="number"
            value={formData.minOrderValue}
            onChange={(e) => handleField('minOrderValue', e.target.value)}
            placeholder="0 = không giới hạn"
            error={formErrors.minOrderValue}
          />
        </div>
        <div>
          <Input
            label="Số lượng mã *"
            type="number"
            value={formData.quantity}
            onChange={(e) => handleField('quantity', e.target.value)}
            placeholder="VD: 100"
            error={formErrors.quantity}
          />
        </div>
      </div>

      {/* Row 4: Ngày */}
      <div className="form-grid-2" style={{ marginBottom: '0.85rem' }}>
        <div>
          <Input
            label="Ngày bắt đầu *"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleField('startDate', e.target.value)}
            error={formErrors.startDate}
          />
        </div>
        <div>
          <Input
            label="Ngày kết thúc *"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleField('endDate', e.target.value)}
            error={formErrors.endDate}
          />
        </div>
      </div>

      {/* Trạng thái */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', color: '#334155' }}>
          Trạng thái
        </label>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {['ACTIVE', 'INACTIVE'].map((s) => (
            <label key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="vStatus" value={s} checked={formData.status === s} onChange={() => handleField('status', s)} />
              <span style={{ fontWeight: 600, color: s === 'ACTIVE' ? '#16a34a' : '#64748b' }}>
                {s === 'ACTIVE' ? '🟢 Đang hoạt động' : '⚪ Tạm dừng'}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexWrap: 'wrap' }}>
        <Button variant="secondary" type="button" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}>Hủy</Button>
        <Button variant="primary" type="submit">{submitLabel}</Button>
      </div>
    </form>
  );

  // ─── Status badge ─────────────────────────────────────────────────────────
  const StatusBadge = ({ voucher }) => {
    const s = getVoucherStatus(voucher);
    const d = STATUS_DISPLAY[s] || STATUS_DISPLAY.INACTIVE;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: d.bg, color: d.color, fontSize: '0.75rem', fontWeight: 700 }}>
        {d.label}
      </span>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admin-vouchers-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            Quản lý mã giảm giá
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Tạo và quản lý các mã voucher / coupon khuyến mãi
          </p>
        </div>
        <Button variant="primary" onClick={openAdd} style={{ padding: '0.65rem 1.35rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>+</span> Thêm mã giảm giá
        </Button>
      </div>

      {/* Stats */}
      <div className="grid-cols-4" style={{ marginBottom: '1.75rem' }}>
        {[
          { label: 'Tổng mã', value: stats.total, color: '#2563eb', bg: '#eff6ff', icon: '🎫' },
          { label: 'Đang hoạt động', value: stats.active, color: '#16a34a', bg: '#dcfce7', icon: '✅' },
          { label: 'Đã hết / Hết lượt', value: stats.expired, color: '#dc2626', bg: '#fef2f2', icon: '⏰' },
          { label: 'Tạm dừng', value: stats.inactive, color: '#64748b', bg: '#f1f5f9', icon: '⏸️' }
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', borderRadius: '14px', border: '1px solid #e2e8f0', minWidth: 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{s.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toolbar: Desktop [Search][Status][Type][Total] | Tablet [Search] / [Status][Type][Total] | Mobile stacked */}
      <div className="card admin-voucher-filter-bar" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: '14px' }}>
        <div className="voucher-filter-search" style={{ position: 'relative', minWidth: 0 }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm theo mã hoặc tên..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>
        <select
          className="voucher-filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#ffffff' }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">✅ Đang hoạt động</option>
          <option value="UPCOMING">🕐 Sắp diễn ra</option>
          <option value="EXPIRED">⏰ Đã hết hạn</option>
          <option value="SOLD_OUT">🚫 Đã hết lượt</option>
          <option value="INACTIVE">⏸️ Tạm dừng</option>
        </select>
        <select
          className="voucher-filter-select"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#ffffff' }}
        >
          <option value="ALL">Tất cả loại</option>
          <option value="FIXED">💰 Giảm tiền</option>
          <option value="PERCENT">% Giảm %</option>
        </select>
        <span className="voucher-filter-total" style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          {filtered.length} / {vouchers.length} mã
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>🎫</div>
            <h3 style={{ margin: '0.5rem 0', color: '#0f172a' }}>Không có mã giảm giá nào</h3>
            <Button variant="primary" onClick={openAdd} style={{ marginTop: '1rem' }}>+ Thêm mã đầu tiên</Button>
          </div>
        ) : (
          <>
            <div className="table-wrapper table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Mã', 'Tên / Mô tả', 'Giá trị giảm', 'Điều kiện', 'Số lượng', 'Thời gian', 'Trạng thái', 'Thao tác'].map((h) => (
                      <th key={h} style={{ padding: '0.75rem 0.85rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Mã */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                          {v.code}
                        </span>
                      </td>
                      {/* Tên */}
                      <td style={{ padding: '0.75rem 0.85rem', maxWidth: '200px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{v.name}</div>
                        {v.description && <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.15rem' }}>{v.description}</div>}
                      </td>
                      {/* Giá trị */}
                      <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: '#dc2626' }}>
                          {v.discountType === 'PERCENT' ? `${v.discountValue}%` : fmtMoney(v.discountValue)}
                        </span>
                        {v.maxDiscount && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tối đa {fmtMoney(v.maxDiscount)}</div>
                        )}
                      </td>
                      {/* Điều kiện */}
                      <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                        {v.minOrderValue > 0 ? `Đơn từ ${fmtMoney(v.minOrderValue)}` : 'Không giới hạn'}
                      </td>
                      {/* Số lượng */}
                      <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{v.usedQuantity} / {v.quantity}</div>
                        <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginTop: '4px', width: '80px' }}>
                          <div style={{ height: '100%', backgroundColor: '#2563eb', borderRadius: '2px', width: `${Math.min(100, (v.usedQuantity / v.quantity) * 100)}%` }} />
                        </div>
                      </td>
                      {/* Thời gian */}
                      <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.775rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        <div>{fmtDate(v.startDate)}</div>
                        <div>→ {fmtDate(v.endDate)}</div>
                      </td>
                      {/* Trạng thái */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <StatusBadge voucher={v} />
                      </td>
                      {/* Thao tác */}
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'nowrap' }}>
                          <button onClick={() => openDetail(v)} title="Xem chi tiết"
                            style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}>Xem</button>
                          <button onClick={() => openEdit(v)} title="Chỉnh sửa"
                            style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}>Sửa</button>
                          <button onClick={() => handleToggle(v)} title={v.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                            style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', border: `1px solid ${v.status === 'ACTIVE' ? '#fde68a' : '#bbf7d0'}`, backgroundColor: v.status === 'ACTIVE' ? '#fefce8' : '#dcfce7', color: v.status === 'ACTIVE' ? '#92400e' : '#166534', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}>
                            {v.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                          </button>
                          <button onClick={() => openDelete(v)} title="Xóa"
                            style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              itemsPerPageOptions={[5, 10, 20]}
              unitName="mã giảm giá"
            />
          </>
        )}
      </div>

      {/* MODAL: Thêm */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm mã giảm giá mới">
        {renderForm(handleSubmitAdd, 'Thêm mã giảm giá')}
      </Modal>

      {/* MODAL: Sửa */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Chỉnh sửa: ${selected?.code || ''}`}>
        {renderForm(handleSubmitEdit, 'Lưu thay đổi')}
      </Modal>

      {/* MODAL: Chi tiết */}
      {selected && (
        <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Chi tiết voucher: ${selected.code}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.25rem', backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.3rem 0.75rem', borderRadius: '8px' }}>{selected.code}</span>
                <StatusBadge voucher={selected} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{selected.name}</h3>
              {selected.description && <p style={{ margin: '0.4rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>{selected.description}</p>}
            </div>
            <div className="form-grid-2">
              {[
                { label: 'Loại giảm', value: selected.discountType === 'FIXED' ? 'Giảm tiền cố định' : 'Giảm theo %' },
                { label: 'Giá trị giảm', value: selected.discountType === 'PERCENT' ? `${selected.discountValue}%` : fmtMoney(selected.discountValue) },
                { label: 'Giảm tối đa', value: selected.maxDiscount ? fmtMoney(selected.maxDiscount) : 'Không giới hạn' },
                { label: 'Đơn tối thiểu', value: selected.minOrderValue > 0 ? fmtMoney(selected.minOrderValue) : 'Không giới hạn' },
                { label: 'Số lượng', value: `${selected.usedQuantity} đã dùng / ${selected.quantity} tổng` },
                { label: 'Thời gian', value: `${fmtDate(selected.startDate)} → ${fmtDate(selected.endDate)}` }
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '0.2rem' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexWrap: 'wrap' }}>
              <Button variant="outline" size="sm" onClick={() => { setIsDetailOpen(false); openEdit(selected); }}>✏️ Chỉnh sửa</Button>
              <Button variant="primary" size="sm" onClick={() => setIsDetailOpen(false)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Xóa */}
      {selected && (
        <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Xác nhận xóa mã giảm giá">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, color: '#334155' }}>
              Bạn có chắc muốn xóa mã <strong style={{ color: '#2563eb' }}>{selected.code}</strong> – "{selected.name}" không?
            </p>
            {selected.usedQuantity > 0 && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: '#dc2626' }}>
                ⚠️ Mã này đã được sử dụng <strong>{selected.usedQuantity}</strong> lần. Việc xóa sẽ không thể hoàn tác.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Hủy</Button>
              <Button variant="danger" onClick={handleDelete}>Xác nhận xóa</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminVouchers;
