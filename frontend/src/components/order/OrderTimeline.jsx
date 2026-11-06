import React, { useState, useEffect, useCallback } from 'react';
import orderService from '../../services/orderService';
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../../utils/constants';

// Cấu hình các bước chuẩn trong vòng đời đơn hàng
const STANDARD_STEPS = [
  {
    key: ORDER_STATUS.PENDING,
    title: 'Đặt hàng thành công',
    icon: '📝',
    description: 'Đơn hàng đã được tạo và chờ hệ thống tiếp nhận'
  },
  {
    key: ORDER_STATUS.CONFIRMED,
    title: 'Đã xác nhận',
    icon: '📋',
    description: 'Người bán / hệ thống đã xác nhận đơn hàng'
  },
  {
    key: ORDER_STATUS.PROCESSING,
    title: 'Đang chuẩn bị hàng',
    icon: '📦',
    description: 'Sản phẩm đang được đóng gói và bàn giao vận chuyển'
  },
  {
    key: ORDER_STATUS.SHIPPING,
    title: 'Đang vận chuyển',
    icon: '🚚',
    description: 'Đơn hàng đang trên đường giao tới bạn'
  },
  {
    key: ORDER_STATUS.DELIVERED,
    title: 'Giao thành công',
    icon: '🎉',
    description: 'Đơn hàng đã được giao tới tay khách hàng'
  }
];

// Thứ tự cấp bậc của các trạng thái chuẩn
const STEP_ORDER_INDEX = {
  [ORDER_STATUS.PENDING]: 0,
  [ORDER_STATUS.PAID]: 1,
  [ORDER_STATUS.CONFIRMED]: 1,
  [ORDER_STATUS.PROCESSING]: 2,
  [ORDER_STATUS.SHIPPING]: 3,
  [ORDER_STATUS.DELIVERED]: 4,
  [ORDER_STATUS.COMPLETED]: 4
};

// Định dạng thời gian theo chuẩn tiếng Việt: dd/MM/yyyy HH:mm:ss
const formatTimelineDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

/**
 * Component OrderTimeline – Triển khai theo task ECOM-173 (và ECOM-311)
 * [FE] Timeline theo dõi đơn hàng từ xác nhận đến đã giao
 * Tích hợp API Backend ECOM-315: GET /api/v1/orders/{id}/history
 *
 * Props:
 * - orderId: ID của đơn hàng cần theo dõi
 * - currentStatus: Trạng thái hiện tại của đơn hàng (tùy chọn)
 * - historyData: Dữ liệu lịch sử đã fetch sẵn (tùy chọn)
 * - compact: boolean (thu gọn để hiển thị trong modal hoặc widget nhỏ)
 */
const OrderTimeline = ({ orderId, currentStatus: propStatus, historyData: propHistory, compact = false }) => {
  const [history, setHistory] = useState(propHistory || []);
  const [loading, setLoading] = useState(!propHistory && Boolean(orderId));
  const [error, setError] = useState('');
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    setIsAccessDenied(false);

    try {
      const data = await orderService.getOrderStatusHistory(orderId);
      // Backend sắp xếp tăng dần theo createdAt (findByOrderIdOrderByCreatedAtAsc)
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
        : [];
      setHistory(sorted);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setIsAccessDenied(true);
        setError('Bạn không có quyền xem thông tin lịch sử đơn hàng này (Bảo mật IDOR).');
      } else {
        setError(err.message || 'Không thể tải dòng thời gian đơn hàng. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (propHistory && Array.isArray(propHistory)) {
      setHistory(propHistory);
      setLoading(false);
    } else if (orderId) {
      fetchHistory();
    }
  }, [orderId, propHistory, fetchHistory]);

  // Xác định trạng thái hiện tại từ prop hoặc bản ghi mới nhất trong history
  const activeStatus =
    propStatus ||
    (history.length > 0 ? history[history.length - 1].status : ORDER_STATUS.PENDING);

  const isCancelled = activeStatus === ORDER_STATUS.CANCELLED;
  const isFailed = activeStatus === ORDER_STATUS.FAILED;
  const isRefunded = activeStatus === ORDER_STATUS.REFUNDED;
  const isTerminated = isCancelled || isFailed || isRefunded;

  // Tính toán các bước hiển thị trên Stepper
  let stepperSteps = [...STANDARD_STEPS];
  if (isCancelled) {
    // Nếu đơn hàng bị hủy, giữ các bước đã hoàn thành và gắn bước HỦY ở cuối
    const lastValidIndex = history.reduce((maxIdx, item) => {
      if (item.status !== ORDER_STATUS.CANCELLED && STEP_ORDER_INDEX[item.status] !== undefined) {
        return Math.max(maxIdx, STEP_ORDER_INDEX[item.status]);
      }
      return maxIdx;
    }, 0);

    stepperSteps = STANDARD_STEPS.slice(0, lastValidIndex + 1);
    stepperSteps.push({
      key: ORDER_STATUS.CANCELLED,
      title: 'Đơn hàng đã hủy',
      icon: '❌',
      description: 'Đơn hàng đã kết thúc và không còn tiếp tục giao vận',
      isErrorStep: true
    });
  } else if (isFailed) {
    const lastValidIndex = history.reduce((maxIdx, item) => {
      if (item.status !== ORDER_STATUS.FAILED && STEP_ORDER_INDEX[item.status] !== undefined) {
        return Math.max(maxIdx, STEP_ORDER_INDEX[item.status]);
      }
      return maxIdx;
    }, 0);

    stepperSteps = STANDARD_STEPS.slice(0, lastValidIndex + 1);
    stepperSteps.push({
      key: ORDER_STATUS.FAILED,
      title: 'Xử lý thất bại',
      icon: '⚠️',
      description: 'Đơn hàng gặp sự cố xử lý',
      isErrorStep: true
    });
  } else if (isRefunded) {
    stepperSteps.push({
      key: ORDER_STATUS.REFUNDED,
      title: 'Đã hoàn tiền',
      icon: '↩️',
      description: 'Số tiền thanh toán đã được hoàn trả lại cho quý khách'
    });
  }

  // Xác định chỉ số bước hiện tại trong chuỗi Stepper
  const currentStepIndex = stepperSteps.findIndex((s) => s.key === activeStatus);
  const activeIndex = currentStepIndex !== -1
    ? currentStepIndex
    : (STEP_ORDER_INDEX[activeStatus] !== undefined ? STEP_ORDER_INDEX[activeStatus] : 0);

  // Lấy thời điểm hoàn thành của một bước từ mảng history (chỉ lấy mốc có thời gian thực tế)
  const getStepCompletedTime = (stepKey) => {
    const found = history.find(
      (h) => h.status === stepKey ||
        (stepKey === ORDER_STATUS.CONFIRMED && h.status === ORDER_STATUS.PAID) ||
        (stepKey === ORDER_STATUS.DELIVERED && h.status === ORDER_STATUS.COMPLETED)
    );
    return found ? formatTimelineDate(found.createdAt) : null;
  };

  // Render Skeleton Loading
  if (loading) {
    return (
      <div
        className="order-timeline-loading"
        style={{
          padding: '1.5rem',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#cbd5e1',
              animation: 'pulse 1.5s infinite'
            }}
          />
          <div
            style={{
              width: '200px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: '#cbd5e1',
              animation: 'pulse 1.5s infinite'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                flex: '1 1 120px',
                height: '50px',
                backgroundColor: '#e2e8f0',
                borderRadius: '8px',
                animation: 'pulse 1.5s infinite'
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render Error State
  if (error && history.length === 0) {
    return (
      <div
        className="order-timeline-error"
        style={{
          padding: '1.5rem',
          backgroundColor: isAccessDenied ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${isAccessDenied ? '#fecaca' : '#fef08a'}`,
          borderRadius: '12px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        }}
      >
        <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{isAccessDenied ? '🚫' : '⚠️'}</span>
        <div style={{ flex: 1 }}>
          <h4
            style={{
              margin: '0 0 0.35rem',
              color: isAccessDenied ? '#991b1b' : '#92400e',
              fontSize: '1rem',
              fontWeight: 700
            }}
          >
            {isAccessDenied ? 'Truy cập bị từ chối' : 'Không thể tải lịch sử đơn hàng'}
          </h4>
          <p style={{ margin: '0 0 0.75rem', color: isAccessDenied ? '#b91c1c' : '#78350f', fontSize: '0.875rem' }}>
            {error}
          </p>
          {!isAccessDenied && (
            <button
              type="button"
              onClick={fetchHistory}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              🔄 Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="order-timeline-card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: compact ? '1rem' : '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      {/* Header thanh tiến trình */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🚀</span>
          <h3 style={{ margin: 0, fontSize: compact ? '1rem' : '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            Tiến trình đơn hàng
          </h3>
          {orderId && (
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              (Đơn #{orderId})
            </span>
          )}
        </div>

        {orderId && (
          <button
            type="button"
            onClick={fetchHistory}
            title="Làm mới tiến trình"
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>🔄</span> Cập nhật
          </button>
        )}
      </div>

      {/* TẦNG 1: STEPPER TIẾN TRÌNH TRỰC QUAN */}
      <div
        className="order-stepper-container"
        style={{
          position: 'relative',
          padding: '1rem 0 1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <div
          className="order-stepper-track"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'relative',
            gap: '0.5rem'
          }}
        >
          {stepperSteps.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isFuture = idx > activeIndex;
            const isError = step.isErrorStep;

            // Xác định màu sắc theo 4 nhóm trạng thái
            let circleBg = '#f1f5f9';
            let circleBorder = '#cbd5e1';
            let circleColor = '#64748b';
            let titleColor = '#64748b';
            let titleWeight = 500;
            let iconSymbol = step.icon;

            if (isError) {
              circleBg = '#fef2f2';
              circleBorder = '#ef4444';
              circleColor = '#dc2626';
              titleColor = '#b91c1c';
              titleWeight = 700;
              iconSymbol = '❌';
            } else if (isCompleted) {
              circleBg = '#ecfdf5';
              circleBorder = '#10b981';
              circleColor = '#059669';
              titleColor = '#065f46';
              titleWeight = 600;
              iconSymbol = '✓';
            } else if (isCurrent) {
              circleBg = '#eff6ff';
              circleBorder = '#2563eb';
              circleColor = '#1d4ed8';
              titleColor = '#1e40af';
              titleWeight = 800;
            }

            const stepTime = getStepCompletedTime(step.key);

            return (
              <div
                key={step.key}
                className={`order-stepper-node ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 2,
                  minWidth: 0
                }}
              >
                {/* Đường nối giữa các node */}
                {idx > 0 && (
                  <div
                    className="order-stepper-line"
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '50%',
                      width: '100%',
                      height: '4px',
                      backgroundColor: idx <= activeIndex && !isError ? '#10b981' : isError && isCurrent ? '#fca5a5' : '#e2e8f0',
                      zIndex: -1,
                      transition: 'background-color 0.3s ease'
                    }}
                  />
                )}

                {/* Vòng tròn Icon của Step */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: circleBg,
                    border: `2px solid ${circleBorder}`,
                    color: circleColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isCompleted ? '1.1rem' : '1.15rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.15)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                  aria-label={`${step.title} (${isCompleted ? 'Đã hoàn thành' : isCurrent ? 'Hiện tại' : 'Chưa đến'})`}
                >
                  {iconSymbol}
                </div>

                {/* Tiêu đề Step */}
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: titleWeight,
                    color: titleColor,
                    marginBottom: '0.2rem',
                    lineHeight: 1.25,
                    padding: '0 0.2rem',
                    wordBreak: 'break-word'
                  }}
                >
                  {step.title}
                </div>

                {/* Thời gian hoàn thành (nếu có) */}
                {stepTime && (
                  <div
                    style={{
                      fontSize: '0.725rem',
                      color: isCurrent ? '#2563eb' : '#64748b',
                      fontWeight: isCurrent ? 600 : 400
                    }}
                  >
                    {stepTime}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cảnh báo đặc biệt nếu đơn hàng bị HỦY hoặc THẤT BẠI */}
      {isTerminated && (
        <div
          style={{
            backgroundColor: isCancelled ? '#fff1f2' : '#fffbeb',
            border: `1px solid ${isCancelled ? '#fecdd3' : '#fde68a'}`,
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>{isCancelled ? '🛑' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, color: isCancelled ? '#be123c' : '#b45309', fontSize: '0.875rem' }}>
              {isCancelled ? 'Đơn hàng đã được hủy' : 'Đơn hàng xử lý thất bại'}
            </div>
            <div style={{ fontSize: '0.8rem', color: isCancelled ? '#9f1239' : '#92400e' }}>
              {history.find((h) => h.status === activeStatus)?.note ||
                (isCancelled
                  ? 'Đơn hàng đã được hủy thành công và hoàn trả số lượng vào kho.'
                  : 'Đơn hàng đã phát sinh sự cố trong quá trình xử lý.')}
            </div>
          </div>
        </div>
      )}

      {/* TẦNG 2: DÒNG THỜI GIAN CHI TIẾT (AUDIT LOG / LỊCH SỬ THỰC TẾ) */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '1.25rem',
          marginTop: '0.5rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: '0.925rem',
              fontWeight: 700,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>⏱️</span> Nhật ký trạng thái chi tiết
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {history.length} mốc ghi nhận
          </span>
        </div>

        {history.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.85rem'
            }}
          >
            Chưa có dữ liệu lịch sử trạng thái được ghi nhận cho đơn hàng này.
          </div>
        ) : (
          <div
            className="order-audit-timeline"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              position: 'relative',
              paddingLeft: '0.5rem'
            }}
          >
            {history.map((record, rIdx) => {
              const isLast = rIdx === history.length - 1;
              const statusLabel = ORDER_STATUS_LABELS[record.status] || record.status;
              const isRecordCancelled = record.status === ORDER_STATUS.CANCELLED;
              const isRecordDelivered = record.status === ORDER_STATUS.DELIVERED || record.status === ORDER_STATUS.COMPLETED;

              return (
                <div
                  key={record.id || rIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    position: 'relative'
                  }}
                >
                  {/* Cột thời gian bên trái */}
                  <div
                    style={{
                      width: '135px',
                      flexShrink: 0,
                      fontSize: '0.775rem',
                      color: isLast ? '#0f172a' : '#64748b',
                      fontWeight: isLast ? 700 : 500,
                      paddingTop: '0.1rem',
                      lineHeight: 1.3
                    }}
                  >
                    {formatTimelineDate(record.createdAt)}
                  </div>

                  {/* Icon chỉ báo mốc thời gian */}
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: isRecordCancelled
                          ? '#ef4444'
                          : isRecordDelivered
                          ? '#10b981'
                          : isLast
                          ? '#2563eb'
                          : '#94a3b8',
                        boxShadow: isLast ? '0 0 0 3px rgba(37, 99, 235, 0.2)' : 'none',
                        zIndex: 2
                      }}
                    />
                    {rIdx < history.length - 1 && (
                      <div
                        style={{
                          width: '2px',
                          flex: 1,
                          minHeight: '28px',
                          backgroundColor: '#e2e8f0',
                          margin: '2px 0'
                        }}
                      />
                    )}
                  </div>

                  {/* Chi tiết nội dung của mốc sự kiện */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: isLast ? '#f8fafc' : '#ffffff',
                      border: isLast ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '0.2rem'
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: isRecordCancelled
                            ? '#dc2626'
                            : isRecordDelivered
                            ? '#059669'
                            : '#1e293b'
                        }}
                      >
                        {statusLabel}
                      </span>

                      {record.actorRole && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: record.actorRole === 'ROLE_ADMIN' ? '#fef3c7' : '#e0e7ff',
                            color: record.actorRole === 'ROLE_ADMIN' ? '#92400e' : '#3730a3',
                            fontWeight: 600
                          }}
                        >
                          {record.actorRole === 'ROLE_ADMIN'
                            ? 'Admin'
                            : record.actorRole === 'SYSTEM'
                            ? 'Hệ thống'
                            : 'Khách hàng'}
                        </span>
                      )}
                    </div>

                    {/* Mô tả trạng thái tiếng Việt thân thiện */}
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#475569',
                        lineHeight: 1.4,
                        marginBottom: record.note ? '0.25rem' : 0
                      }}
                    >
                      {record.statusDescription || `Chuyển trạng thái sang ${statusLabel}`}
                    </div>

                    {/* Ghi chú đính kèm nếu có */}
                    {record.note && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          fontStyle: 'italic',
                          backgroundColor: '#f1f5f9',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          marginTop: '0.25rem'
                        }}
                      >
                        💬 Ghi chú: {record.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Responsive Inline CSS */}
      <style>{`
        @media (max-width: 640px) {
          .order-stepper-track {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem !important;
          }
          .order-stepper-node {
            flex-direction: row !important;
            align-items: center !important;
            text-align: left !important;
            gap: 0.75rem !important;
          }
          .order-stepper-line {
            display: none !important;
          }
          .order-stepper-node > div:first-of-type {
            margin-bottom: 0 !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderTimeline;
