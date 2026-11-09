import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import OrderStatus from '../../components/order/OrderStatus';

const STATUS_META = [
  {
    key: 'PENDING',
    label: 'Chờ xác nhận (PENDING)',
    shortLabel: 'Chờ xác nhận',
    group: 'Chờ xử lý',
    color: '#d97706',
    bg: '#fef3c7'
  },
  {
    key: 'PAID',
    label: 'Đã thanh toán (PAID)',
    shortLabel: 'Đã thanh toán',
    group: 'Đang xử lý',
    color: '#0284c7',
    bg: '#e0f2fe'
  },
  {
    key: 'CONFIRMED',
    label: 'Đã xác nhận (CONFIRMED)',
    shortLabel: 'Đã xác nhận',
    group: 'Đang xử lý',
    color: '#2563eb',
    bg: '#dbeafe'
  },
  {
    key: 'PROCESSING',
    label: 'Đang chuẩn bị hàng (PROCESSING)',
    shortLabel: 'Đang xử lý',
    group: 'Đang xử lý',
    color: '#7c3aed',
    bg: '#ede9fe'
  },
  {
    key: 'SHIPPING',
    label: 'Đang giao hàng (SHIPPING)',
    shortLabel: 'Đang giao',
    group: 'Đang xử lý',
    color: '#0891b2',
    bg: '#cffafe'
  },
  {
    key: 'DELIVERED',
    label: 'Giao thành công (DELIVERED)',
    shortLabel: 'Thành công',
    group: 'Hoàn thành',
    color: '#16a34a',
    bg: '#dcfce7'
  },
  {
    key: 'CANCELLED',
    label: 'Đã hủy (CANCELLED)',
    shortLabel: 'Đã hủy',
    group: 'Hủy / Hoàn tiền',
    color: '#dc2626',
    bg: '#fee2e2'
  },
  {
    key: 'FAILED',
    label: 'Thanh toán lỗi (FAILED)',
    shortLabel: 'Thất bại',
    group: 'Hủy / Hoàn tiền',
    color: '#991b1b',
    bg: '#fef2f2'
  },
  {
    key: 'REFUNDED',
    label: 'Đã hoàn tiền (REFUNDED)',
    shortLabel: 'Hoàn tiền',
    group: 'Hủy / Hoàn tiền',
    color: '#475569',
    bg: '#f1f5f9'
  }
];

const REVENUE_STATUS_SET = new Set([
  'PAID',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED'
]);

const toISODateInput = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fmtDateShort = (dateStr) => {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtDateTime = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleString('vi-VN');
};

const Dashboard = () => {
  const [statsData, setStatsData] = useState(null);
  const [realOrders, setRealOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc khoảng thời gian (ALL | TODAY | 7DAYS | MONTH | CUSTOM)
  const [rangePreset, setRangePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const applyPresetRange = (preset) => {
    setRangePreset(preset);
    const now = new Date();

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      return;
    }
    if (preset === 'TODAY') {
      const todayStr = toISODateInput(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }
    if (preset === '7DAYS') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setStartDate(toISODateInput(past));
      setEndDate(toISODateInput(now));
      return;
    }
    if (preset === 'MONTH') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toISODateInput(firstOfMonth));
      setEndDate(toISODateInput(now));
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [statsRes, ordersRes] = await Promise.allSettled([
        orderService.getOrderStats({ startDate, endDate }),
        orderService.getRealOrdersForDashboard(100)
      ]);

      if (statsRes.status === 'rejected') {
        throw (
          statsRes.reason ||
          new Error('Không thể tải dữ liệu thống kê từ máy chủ.')
        );
      }

      setStatsData(statsRes.value);
      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
        setRealOrders(ordersRes.value);
      } else {
        setRealOrders([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể kết nối đến máy chủ thống kê. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Các chỉ số KPI thực tế từ Backend DashboardResponse
  const totalRevenue = Number(statsData?.totalRevenue ?? 0);
  const totalOrders = Number(statsData?.totalOrders ?? 0);
  const completedOrders = Number(statsData?.completedOrders ?? 0);
  const processingOrders = Number(statsData?.processingOrders ?? 0);
  const pendingOrders = Number(statsData?.pendingOrders ?? 0);
  const cancelledOrders = Number(statsData?.cancelledOrders ?? 0);
  const totalUsers = Number(statsData?.totalUsers ?? 0);
  const lowStockProductsCount = Number(statsData?.lowStockProductsCount ?? 0);

  // 7 Thẻ KPI bắt buộc theo yêu cầu TASK 1
  const kpiCards = [
    {
      title: 'Tổng doanh thu',
      value: formatCurrency(totalRevenue),
      sub: 'Tính trên đơn đã thanh toán & hoàn tất',
      icon: '💰',
      color: '#2563eb',
      bg: '#eff6ff'
    },
    {
      title: 'Tổng đơn hàng',
      value: totalOrders.toLocaleString('vi-VN'),
      sub: 'Toàn bộ đơn phát sinh trên hệ thống',
      icon: '📦',
      color: '#0f172a',
      bg: '#f1f5f9'
    },
    {
      title: 'Đơn hàng thành công',
      value: completedOrders.toLocaleString('vi-VN'),
      sub: 'Trạng thái Đã giao (DELIVERED)',
      icon: '✅',
      color: '#16a34a',
      bg: '#dcfce7'
    },
    {
      title: 'Đơn hàng đang xử lý',
      value: processingOrders.toLocaleString('vi-VN'),
      sub: 'Đã thanh toán / Xác nhận / Đang giao',
      icon: '🚚',
      color: '#0284c7',
      bg: '#e0f2fe'
    },
    {
      title: 'Đơn hàng chờ xử lý',
      value: pendingOrders.toLocaleString('vi-VN'),
      sub: 'Đơn mới chờ duyệt (PENDING)',
      icon: '⏳',
      color: '#d97706',
      bg: '#fef3c7'
    },
    {
      title: 'Đơn hàng đã hủy',
      value: cancelledOrders.toLocaleString('vi-VN'),
      sub: 'Trạng thái Đã hủy (CANCELLED)',
      icon: '❌',
      color: '#dc2626',
      bg: '#fee2e2'
    },
    {
      title: 'Tổng khách hàng',
      value: totalUsers.toLocaleString('vi-VN'),
      sub: 'Tài khoản khách hàng đã đăng ký',
      icon: '👥',
      color: '#7c3aed',
      bg: '#ede9fe'
    }
  ];

  // Thống kê chi tiết từng trạng thái từ ordersByStatus của Backend
  const statusBreakdown = useMemo(() => {
    const map = statsData?.ordersByStatus || {};
    return STATUS_META.map((meta) => {
      const count = Number(map[meta.key] ?? 0);
      const percentage =
        totalOrders > 0 ? Math.round((count / totalOrders) * 1000) / 10 : 0;
      return {
        ...meta,
        count,
        percentage
      };
    });
  }, [statsData, totalOrders]);

  // Tổng hợp dữ liệu biểu đồ doanh thu thực tế theo ngày từ danh sách đơn hàng thật của Backend
  const dailyRevenueSeries = useMemo(() => {
    if (!Array.isArray(realOrders) || realOrders.length === 0) return [];

    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

    const grouped = new Map();

    for (const ord of realOrders) {
      if (!ord || !ord.createdAt) continue;
      const createdDate = new Date(ord.createdAt);
      if (isNaN(createdDate.getTime())) continue;

      const t = createdDate.getTime();
      if (startMs !== null && t < startMs) continue;
      if (endMs !== null && t > endMs) continue;

      const dateKey = toISODateInput(createdDate);
      const current = grouped.get(dateKey) || {
        dateKey,
        label: fmtDateShort(dateKey),
        revenue: 0,
        orderCount: 0,
        revenueOrderCount: 0
      };

      current.orderCount += 1;
      const statusUpper = String(ord.status || '').toUpperCase();
      if (REVENUE_STATUS_SET.has(statusUpper)) {
        current.revenue += Number(ord.finalAmount ?? ord.totalAmount ?? 0);
        current.revenueOrderCount += 1;
      }

      grouped.set(dateKey, current);
    }

    return Array.from(grouped.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-14); // Tối đa 14 mốc ngày gần nhất có dữ liệu thực tế
  }, [realOrders, startDate, endDate]);

  const maxDailyRevenue = useMemo(() => {
    if (dailyRevenueSeries.length === 0) return 0;
    return Math.max(...dailyRevenueSeries.map((d) => d.revenue), 0);
  }, [dailyRevenueSeries]);

  // Các chỉ số tổng quan hoạt động hệ thống
  const systemMetrics = useMemo(() => {
    const completionRate =
      totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0.0';
    const cancellationRate =
      totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : '0.0';
    const revenueGeneratingOrders = completedOrders + processingOrders;
    const avgOrderValue =
      revenueGeneratingOrders > 0
        ? Math.round(totalRevenue / revenueGeneratingOrders)
        : 0;

    return {
      completionRate,
      cancellationRate,
      avgOrderValue,
      revenueGeneratingOrders
    };
  }, [totalOrders, completedOrders, cancelledOrders, processingOrders, totalRevenue]);

  // Tính toán các cung tròn cho Biểu đồ Donut phân bổ trạng thái đơn hàng
  const donutSegments = useMemo(() => {
    if (totalOrders <= 0) return [];
    const radius = 62;
    const circumference = 2 * Math.PI * radius;
    let accumulatedRatio = 0;

    return statusBreakdown
      .filter((item) => item.count > 0)
      .map((item) => {
        const ratio = item.count / totalOrders;
        const dashLength = ratio * circumference;
        const dashOffset = -accumulatedRatio * circumference;
        accumulatedRatio += ratio;
        return {
          ...item,
          radius,
          circumference,
          dashArray: `${dashLength} ${circumference - dashLength}`,
          dashOffset
        };
      });
  }, [statusBreakdown, totalOrders]);

  return (
    <div className="admin-dashboard-page">
      {/* 1. HEADER & NÚT LÀM MỚI */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}
          >
            Dashboard Thống kê Doanh thu & Đơn hàng
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Báo cáo số liệu kinh doanh, phân bổ trạng thái đơn hàng và hoạt động hệ thống theo thời gian thực
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          disabled={loading}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.55rem 1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#2563eb',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🔄</span>
          <span>{loading ? 'Đang đồng bộ...' : 'Làm mới số liệu'}</span>
        </button>
      </div>

      {/* 2. BỘ LỌC THỜI GIAN (Gửi startDate / endDate lên GET /api/v1/admin/statistics) */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          borderRadius: '14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginRight: '0.25rem' }}>
            📅 Kỳ thống kê:
          </span>
          {[
            { id: 'ALL', label: 'Tất cả thời gian' },
            { id: 'TODAY', label: 'Hôm nay' },
            { id: '7DAYS', label: '7 ngày qua' },
            { id: 'MONTH', label: 'Tháng này' }
          ].map((tab) => {
            const active = rangePreset === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => applyPresetRange(tab.id)}
                style={{
                  padding: '0.42rem 0.85rem',
                  borderRadius: '8px',
                  border: active ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: active ? '#2563eb' : '#ffffff',
                  color: active ? '#ffffff' : '#334155',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#475569' }}>
            <span>Từ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setRangePreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              aria-label="Từ ngày"
              style={{
                padding: '0.38rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#475569' }}>
            <span>Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setRangePreset('CUSTOM');
                setEndDate(e.target.value);
              }}
              aria-label="Đến ngày"
              style={{
                padding: '0.38rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem'
              }}
            />
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => applyPresetRange('ALL')}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 0.25rem'
              }}
            >
              ✕ Xóa lọc ngày
            </button>
          )}
        </div>
      </div>

      {/* HIỂN THỊ LỖI NẾU CÓ */}
      {error && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ErrorMessage message={error} onClose={() => setError('')} />
        </div>
      )}

      {/* TRẠNG THÁI ĐANG TẢI */}
      {loading ? (
        <div className="card" style={{ padding: '3.5rem 1rem', borderRadius: '14px' }}>
          <Loading message="Đang tải dữ liệu thống kê doanh thu và đơn hàng từ Backend..." />
        </div>
      ) : error && !statsData ? (
        /* ERROR STATE KHI API THẤT BẠI HOÀN TOÀN */
        <div
          className="card"
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            borderRadius: '14px',
            color: '#64748b'
          }}
        >
          <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h3 style={{ margin: '0 0 0.4rem', color: '#0f172a', fontWeight: 700 }}>
            Không thể tải dữ liệu Dashboard
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#dc2626', margin: '0 0 1.25rem' }}>
            {error}
          </p>
          <Button variant="primary" size="sm" onClick={fetchDashboardData}>
            🔄 Thử lại ngay
          </Button>
        </div>
      ) : (
        <>
          {/* 3. DANH SÁCH 7 THẺ KPI BẮT BUỘC (Responsive tự động xuống dòng) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem'
            }}
          >
            {kpiCards.map((card) => (
              <div
                key={card.title}
                className="card"
                style={{
                  padding: '1.15rem 1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: card.bg,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.45rem',
                    flexShrink: 0
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: card.color,
                      lineHeight: 1.25,
                      marginTop: '2px',
                      wordBreak: 'break-word'
                    }}
                  >
                    {card.value}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                    {card.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4. KHU VỰC BIỂU ĐỒ: BIỂU ĐỒ DOANH THU & BIỂU ĐỒ PHÂN BỔ TRẠNG THÁI ĐƠN HÀNG */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.75rem'
            }}
          >
            {/* 4A. BIỂU ĐỒ DOANH THU THỰC TẾ THEO NGÀY */}
            <div className="card" style={{ borderRadius: '14px', padding: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    📈 Biểu đồ Doanh thu & Đơn hàng theo ngày
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Tổng hợp từ các đơn hàng thực tế trên hệ thống (không dùng dữ liệu giả)
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px'
                  }}
                >
                  Tổng: {formatCurrency(totalRevenue)}
                </span>
              </div>

              {dailyRevenueSeries.length === 0 ? (
                <div
                  style={{
                    padding: '2.75rem 1rem',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📊</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                    Chưa có dữ liệu đơn hàng theo ngày trong kỳ này
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Biểu đồ sẽ tự động hiển thị ngay khi có đơn hàng phát sinh trên Backend.
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '0.55rem',
                      height: '210px',
                      padding: '1.25rem 0.5rem 0.5rem',
                      borderBottom: '1px solid #e2e8f0',
                      overflowX: 'auto'
                    }}
                  >
                    {dailyRevenueSeries.map((point) => {
                      const heightPct =
                        maxDailyRevenue > 0
                          ? Math.max((point.revenue / maxDailyRevenue) * 100, point.revenue > 0 ? 8 : 3)
                          : 4;
                      return (
                        <div
                          key={point.dateKey}
                          style={{
                            flex: '1 0 42px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end'
                          }}
                          title={`Ngày ${point.dateKey}: Doanh thu ${formatCurrency(point.revenue)} (${point.orderCount} đơn)`}
                        >
                          <div
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              color: '#1e293b',
                              marginBottom: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {point.revenue > 0
                              ? `${Math.round(point.revenue / 1000).toLocaleString('vi-VN')}k`
                              : '0'}
                          </div>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '38px',
                              height: `${heightPct}%`,
                              background:
                                point.revenue > 0
                                  ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                                  : '#cbd5e1',
                              borderRadius: '6px 6px 0 0',
                              transition: 'height 0.3s ease'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Nhãn trục hoành (Ngày + Số đơn) */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.55rem',
                      padding: '0.45rem 0.5rem 0',
                      overflowX: 'auto'
                    }}
                  >
                    {dailyRevenueSeries.map((point) => (
                      <div
                        key={point.dateKey}
                        style={{
                          flex: '1 0 42px',
                          textAlign: 'center',
                          fontSize: '0.72rem',
                          color: '#475569'
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{point.label}</div>
                        <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                          {point.orderCount} đơn
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4B. BIỂU ĐỒ PHÂN BỔ TRẠNG THÁI ĐƠN HÀNG (DONUT + PROGRESS BARS) */}
            <div className="card" style={{ borderRadius: '14px', padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  🎯 Biểu đồ Phân bổ Trạng thái Đơn hàng
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Tỷ trọng đơn hàng theo từng trạng thái từ API Thống kê Backend
                </p>
              </div>

              {totalOrders === 0 ? (
                <div
                  style={{
                    padding: '2.75rem 1rem',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📭</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                    Chưa có đơn hàng nào trong khoảng thời gian này
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Hãy chọn &quot;Tất cả thời gian&quot; hoặc kiểm tra lại bộ lọc ngày.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* SVG Donut Chart */}
                  <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto', flexShrink: 0 }}>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle
                        cx="80"
                        cy="80"
                        r="62"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="20"
                      />
                      {donutSegments.map((seg) => (
                        <circle
                          key={seg.key}
                          cx="80"
                          cy="80"
                          r={seg.radius}
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="20"
                          strokeDasharray={seg.dashArray}
                          strokeDashoffset={seg.dashOffset}
                          transform="rotate(-90 80 80)"
                        >
                          <title>{`${seg.label}: ${seg.count} đơn (${seg.percentage}%)`}</title>
                        </circle>
                      ))}
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        pointerEvents: 'none'
                      }}
                    >
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                        {totalOrders}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        Tổng đơn
                      </span>
                    </div>
                  </div>

                  {/* Thanh tỷ trọng các trạng thái có đơn */}
                  <div style={{ flex: 1, minWidth: '210px', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {statusBreakdown
                      .filter((s) => s.count > 0 || ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'].includes(s.key))
                      .map((item) => (
                        <div key={item.key}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.78rem',
                              marginBottom: '3px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  backgroundColor: item.color,
                                  display: 'inline-block'
                                }}
                              />
                              {item.shortLabel}
                            </span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {item.count} đơn ({item.percentage}%)
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '7px',
                              borderRadius: '9999px',
                              backgroundColor: '#f1f5f9',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, item.percentage)}%`,
                                height: '100%',
                                backgroundColor: item.color,
                                borderRadius: '9999px'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. BẢNG THỐNG KÊ ĐƠN HÀNG THEO TRẠNG THÁI & TỔNG QUAN HOẠT ĐỘNG HỆ THỐNG */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.75rem'
            }}
          >
            {/* 5A. BẢNG THỐNG KÊ ĐƠN HÀNG THEO TRẠNG THÁI */}
            <div className="card" style={{ borderRadius: '14px', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.15rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  📋 Bảng Thống kê Đơn hàng theo Trạng thái
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Chi tiết số lượng và tỷ lệ phần trăm của toàn bộ 9 trạng thái đơn hàng
                </p>
              </div>

              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '520px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th>Trạng thái</th>
                      <th>Nhóm xử lý</th>
                      <th style={{ textAlign: 'right' }}>Số lượng đơn</th>
                      <th style={{ textAlign: 'right' }}>Tỷ trọng</th>
                      <th style={{ textAlign: 'center' }}>Tra cứu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusBreakdown.map((row) => (
                      <tr key={row.key}>
                        <td>
                          <OrderStatus status={row.key} />
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                          {row.group}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: row.count > 0 ? '#0f172a' : '#94a3b8'
                          }}
                        >
                          {row.count.toLocaleString('vi-VN')}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            color: row.color
                          }}
                        >
                          {row.percentage}%
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link
                            to="/admin/orders"
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: '#2563eb'
                            }}
                          >
                            Xem đơn →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5B. TỔNG QUAN HOẠT ĐỘNG HỆ THỐNG & ĐƠN HÀNG MỚI NHẤT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Tổng quan vận hành */}
              <div className="card" style={{ borderRadius: '14px', padding: '1.25rem' }}>
                <h2 style={{ margin: '0 0 0.85rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  ⚡ Tổng quan Hoạt động Hệ thống
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}
                >
                  <div
                    style={{
                      padding: '0.8rem',
                      borderRadius: '10px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                      Tỷ lệ giao thành công
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                      {systemMetrics.completionRate}%
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.8rem',
                      borderRadius: '10px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>
                      Tỷ lệ đơn bị hủy
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                      {systemMetrics.cancellationRate}%
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.8rem',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>
                      Giá trị đơn trung bình
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                      {formatCurrency(systemMetrics.avgOrderValue)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.8rem',
                      borderRadius: '10px',
                      backgroundColor: lowStockProductsCount > 0 ? '#fffbeb' : '#f8fafc',
                      border: `1px solid ${lowStockProductsCount > 0 ? '#fde68a' : '#e2e8f0'}`
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
                      SP sắp hết hàng
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                      {lowStockProductsCount} SP
                    </div>
                  </div>
                </div>

                {/* Các lối tắt quản trị */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <Link
                    to="/admin/orders"
                    style={{
                      padding: '0.55rem 0.9rem',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}
                  >
                    📑 Quản lý đơn hàng ({pendingOrders} chờ duyệt)
                  </Link>
                  <Link
                    to="/admin/users"
                    style={{
                      padding: '0.55rem 0.9rem',
                      backgroundColor: '#f5f3ff',
                      color: '#6d28d9',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}
                  >
                    👥 Quản lý khách hàng ({totalUsers})
                  </Link>
                  <Link
                    to="/admin/inventory"
                    style={{
                      padding: '0.55rem 0.9rem',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}
                  >
                    ⚠️ Kiểm tra tồn kho ({lowStockProductsCount} cảnh báo)
                  </Link>
                  <Link
                    to="/admin/products/new"
                    style={{
                      padding: '0.55rem 0.9rem',
                      backgroundColor: '#f0fdf4',
                      color: '#166534',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}
                  >
                    ➕ Thêm sản phẩm mới
                  </Link>
                </div>
              </div>

              {/* Đơn hàng mới nhất từ API thực tế */}
              <div className="card" style={{ borderRadius: '14px', padding: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.85rem'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                    🕒 Đơn hàng mới nhất từ hệ thống
                  </h3>
                  <Link
                    to="/admin/orders"
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}
                  >
                    Xem tất cả →
                  </Link>
                </div>

                {realOrders.length === 0 ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      color: '#64748b',
                      fontSize: '0.84rem'
                    }}
                  >
                    Chưa có đơn hàng nào được ghi nhận trên hệ thống.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {realOrders.slice(0, 5).map((ord) => (
                      <div
                        key={ord.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#0f172a' }}>#{ord.id}</strong>
                          <span style={{ color: '#475569', fontWeight: 600 }}>
                            {ord.receiverName || `KH #${ord.userId || '—'}`}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                            {fmtDateTime(ord.createdAt)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <OrderStatus status={ord.status} />
                          <strong style={{ color: '#dc2626' }}>
                            {formatCurrency(ord.finalAmount ?? ord.totalAmount ?? 0)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
