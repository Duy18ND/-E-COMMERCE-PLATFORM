import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import saleService from '../../services/saleService';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/admin/Pagination';

const AdminSales = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [timeFilter, setTimeFilter] = useState('this_month');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Preview Modal state
  const [previewCampaign, setPreviewCampaign] = useState(null);

  // Load campaigns from service
  const loadCampaigns = () => {
    const list = saleService.getAllCampaigns();
    setCampaigns(list);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const upcoming = campaigns.filter((c) => c.status === 'UPCOMING').length;
    const ended = campaigns.filter((c) => c.status === 'ENDED').length;
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
    const totalSkus = campaigns.reduce((sum, c) => sum + (c.productCount || 0), 0);
    return { total, active, upcoming, ended, totalRevenue, totalSkus };
  }, [campaigns]);

  // Filtered & Sorted
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((camp) => {
        const term = searchTerm.toLowerCase().trim();
        const matchSearch =
          camp.name.toLowerCase().includes(term) ||
          camp.code.toLowerCase().includes(term) ||
          (camp.categoryTag && camp.categoryTag.toLowerCase().includes(term));

        const matchStatus = statusFilter === 'ALL' ? true : camp.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.startTime) - new Date(a.startTime);
        if (sortBy === 'revenue_desc') return (b.revenue || 0) - (a.revenue || 0);
        if (sortBy === 'products_desc') return (b.productCount || 0) - (a.productCount || 0);
        if (sortBy === 'sold_desc') return (b.percentSold || 0) - (a.percentSold || 0);
        return 0;
      });
  }, [campaigns, statusFilter, searchTerm, sortBy]);

  // Paginated slice
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCampaigns, currentPage, itemsPerPage]);

  // Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredCampaigns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCampaigns.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleStatus = (id) => {
    saleService.toggleCampaignStatus(id);
    loadCampaigns();
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa chiến dịch "${name}"? Thao tác này không thể hoàn tác.`)) {
      saleService.deleteCampaign(id);
      loadCampaigns();
    }
  };

  const handleExportReport = () => {
    alert(`Đã xuất báo cáo chiến dịch Flash Sale (${filteredCampaigns.length} bản ghi). File CSV đã được tạo.`);
  };

  const handleResetData = () => {
    if (window.confirm('Khôi phục dữ liệu mẫu ban đầu cho toàn bộ chiến dịch Flash Sale?')) {
      saleService.resetMockData();
      loadCampaigns();
    }
  };

  return (
    <div>
      {/* 1. TOP HERO HEADER (THEO ĐÚNG ẢNH MẪU 4) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.35)'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.725rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem'
            }}
          >
            <span>THƯƠNG MẠI & TIẾP THỊ</span>
            <span>•</span>
            <span>Chiến dịch Q2</span>
            <span>•</span>
            <span>Realtime Sync</span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, margin: '0 0 0.35rem', letterSpacing: '-0.02em' }}>
            Quản lý Sale & Khuyến mãi
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, maxWidth: '640px', lineHeight: 1.5 }}>
            Thiết lập, theo dõi và đo lường hiệu quả các chiến dịch Flash Sale & Giảm giá trên toàn hệ thống ShopMart Omnichannel.
          </p>
        </div>

        {/* Top Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportReport}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📥</span>
            <span>Xuất Báo Cáo</span>
          </button>

          <Link to="/admin/sales/new" style={{ textDecoration: 'none' }}>
            <button
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.35rem',
                fontSize: '0.875rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.45)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>➕</span>
              <span>Tạo chương trình Sale mới</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 2. SIX METRIC KPI CARDS (THEO ĐÚNG ẢNH MẪU 4) */}
      <div
        className="admin-kpi-6"
        style={{
          marginBottom: '1.5rem'
        }}
      >
        {/* Card 1: Tổng chương trình */}
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b' }}>TỔNG CHƯƠNG TRÌNH</span>
            <span style={{ color: '#2563eb' }}>🏷️</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a' }}>{metrics.total}</div>
          <div style={{ fontSize: '0.725rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
            +2 so với tuần trước
          </div>
        </div>

        {/* Card 2: Đang hoạt động */}
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b' }}>ĐANG HOẠT ĐỘNG</span>
            <span style={{ color: '#2563eb' }}>⚡</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#2563eb' }}>{metrics.active}</span>
            <span style={{ fontSize: '0.65rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              ● Active
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
            Chiếm 62% traffic hiện thời
          </div>
        </div>

        {/* Card 3: Sắp diễn ra */}
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #ea580c' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b' }}>SẮP DIỄN RA</span>
            <span style={{ color: '#ea580c' }}>⏱️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ea580c' }}>{metrics.upcoming}</span>
            <span style={{ fontSize: '0.65rem', backgroundColor: '#fff7ed', color: '#c2410c', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              Upcoming
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
            Gần nhất: 20:00 tối nay
          </div>
        </div>

        {/* Card 4: Đã kết thúc */}
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b' }}>ĐÃ KẾT THÚC</span>
            <span style={{ color: '#64748b' }}>✓</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#475569' }}>{metrics.ended}</span>
            <span style={{ fontSize: '0.65rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              Ended
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
            Đã lưu trữ dữ liệu
          </div>
        </div>

        {/* Card 5: Sản phẩm đang sale */}
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b' }}>SẢN PHẨM ĐANG SALE</span>
            <span style={{ color: '#8b5cf6' }}>📦</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#6d28d9' }}>{metrics.totalSkus}</span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>SKU</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
            6 SKU gần chạm min tồn kho
          </div>
        </div>

        {/* Card 6: Tổng doanh thu */}
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b' }}>TỔNG DOANH THU</span>
            <span style={{ color: '#16a34a' }}>💰</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a', whiteSpace: 'nowrap' }}>
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
            +18.4% mục tiêu tháng
          </div>
        </div>
      </div>

      {/* 3. REALTIME HIGHLIGHT BANNER (THEO ĐÚNG ẢNH MẪU 4) */}
      <div
        className="card"
        style={{
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#fff7ed',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#ffedd5',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            🔥
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#9a3412' }}>
                Flash Sale Đang Diễn Ra Cao Điểm
              </span>
              <span
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7c2d12', marginTop: '2px' }}>
              &quot;Flash Sale Giữa Tháng Tech Day&quot; còn <strong>03:42:15</strong>. Tốc độ xuất kho: <strong>14.8 món/phút</strong>.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#9a3412' }}>Tỷ lệ chuyển đổi</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a' }}>
              12.8% <span style={{ fontSize: '0.75rem' }}>↑ 3.2%</span>
            </div>
          </div>

          <button
            onClick={() => alert('Radar Live: Tải lượng hệ thống ổn định, 1,482 phiên active cùng lúc.')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #fed7aa',
              color: '#c2410c',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
          >
            Xem Radar Live
          </button>
        </div>
      </div>

      {/* 4. SEARCH & FILTER TOOLBAR */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '380px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên chiến dịch, mã voucher..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `Tất cả (${campaigns.length})` },
              { id: 'ACTIVE', label: `Active (${metrics.active})` },
              { id: 'UPCOMING', label: `Upcoming (${metrics.upcoming})` },
              { id: 'ENDED', label: `Ended (${metrics.ended})` },
              { id: 'DRAFT', label: 'Draft (0)' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  backgroundColor: statusFilter === tab.id ? '#2563eb' : '#f1f5f9',
                  color: statusFilter === tab.id ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort & Date Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="revenue_desc">Doanh thu cao nhất</option>
              <option value="products_desc">Số sản phẩm nhiều nhất</option>
              <option value="sold_desc">Tỷ lệ bán cao nhất</option>
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="this_month">📅 Tháng này</option>
              <option value="this_week">📅 Tuần này</option>
              <option value="all_time">📅 Toàn thời gian</option>
            </select>

            <button
              onClick={handleResetData}
              title="Đặt lại dữ liệu mẫu ban đầu"
              style={{
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              🔄
            </button>
          </div>
        </div>

        {/* Filter tags below */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>Đang áp dụng:</span>
            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Kênh: Website + App Omnichannel ✕
            </span>
            <span style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Giảm giá &gt; 15% ✕
            </span>
            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700 }}
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>

          <span>
            Hiển thị <strong>{filteredCampaigns.length}</strong> / {campaigns.length} chiến dịch
          </span>
        </div>
      </div>

      {/* 5. DATA TABLE (THEO ĐÚNG ẢNH MẪU 4) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredCampaigns.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🏷️</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Không tìm thấy chiến dịch nào
            </h3>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Hãy thử xóa bộ lọc tìm kiếm hoặc tạo một chiến dịch mới.
            </p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th style={{ minWidth: '280px' }}>TÊN CHƯƠNG TRÌNH & BANNER</th>
                  <th style={{ minWidth: '180px' }}>THỜI GIAN DIỄN RA</th>
                  <th style={{ textAlign: 'center' }}>SỐ SẢN PHẨM</th>
                  <th>DOANH THU ĐẠT ĐƯỢC</th>
                  <th style={{ minWidth: '170px' }}>TIẾN ĐỘ BÁN</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: 'center', minWidth: '180px' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCampaigns.map((camp) => {
                  const isChecked = selectedIds.includes(camp.id);
                  const isCampActive = camp.status === 'ACTIVE';
                  const isCampEnded = camp.status === 'ENDED';

                  return (
                    <tr key={camp.id} style={{ backgroundColor: isChecked ? '#eff6ff' : undefined }}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(camp.id)}
                        />
                      </td>

                      {/* Tên chương trình & Banner */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          {/* Banner thumbnail */}
                          <div
                            style={{
                              width: '64px',
                              height: '42px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              backgroundColor: '#0f172a',
                              flexShrink: 0,
                              position: 'relative'
                            }}
                          >
                            <img
                              src={camp.bannerUrl || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80'}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                top: '2px',
                                left: '2px',
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                padding: '1px 4px',
                                borderRadius: '3px'
                              }}
                            >
                              {camp.badgeText || '-30%'}
                            </span>
                          </div>

                          {/* Info */}
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.925rem' }}>
                              {camp.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', fontSize: '0.75rem', color: '#64748b' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontWeight: 600, color: '#2563eb' }}>
                                {camp.code}
                              </span>
                              <span>•</span>
                              <span>Tag: {camp.categoryTag || 'Toàn sàn'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Thời gian diễn ra */}
                      <td>
                        <div style={{ fontSize: '0.825rem', color: '#334155' }}>
                          <div>
                            <strong>Bắt đầu:</strong> {new Date(camp.startTime).toLocaleDateString('vi-VN')} {new Date(camp.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div>
                            <strong>Kết thúc:</strong> {new Date(camp.endTime).toLocaleDateString('vi-VN')} {new Date(camp.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Status badge pill */}
                        <div style={{ marginTop: '4px' }}>
                          {isCampActive ? (
                            <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span>⏱️</span> Còn 03h 42m
                            </span>
                          ) : camp.status === 'UPCOMING' ? (
                            <span style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span>⏳</span> Bắt đầu sau 3 ngày
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span>✓</span> Đã chốt số
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Số sản phẩm */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.875rem',
                            backgroundColor: '#f1f5f9',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            color: '#0f172a'
                          }}
                        >
                          {camp.productCount || 0} SP
                        </span>
                      </td>

                      {/* Doanh thu đạt được */}
                      <td>
                        <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.95rem' }}>
                          {formatCurrency(camp.revenue || 0)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          Mục tiêu: {formatCurrency(camp.targetRevenue || 100000000)}
                          {camp.targetRevenue > 0 && ` (${Math.round(((camp.revenue || 0) / camp.targetRevenue) * 100)}%)`}
                        </div>
                      </td>

                      {/* Tiến độ bán */}
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                          <span style={{ fontWeight: 700, color: camp.percentSold > 70 ? '#dc2626' : '#2563eb' }}>
                            {camp.percentSold || 0}% đã bán
                          </span>
                          <span style={{ color: '#64748b' }}>
                            {camp.soldQuantity || 0} / {camp.targetQuantity || 500}
                          </span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${camp.percentSold || 0}%`,
                              backgroundColor: camp.percentSold > 70 ? '#dc2626' : '#2563eb',
                              borderRadius: '9999px'
                            }}
                          />
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            backgroundColor: isCampActive ? '#dcfce7' : camp.status === 'UPCOMING' ? '#fef3c7' : '#f1f5f9',
                            color: isCampActive ? '#166534' : camp.status === 'UPCOMING' ? '#92400e' : '#475569'
                          }}
                        >
                          {camp.status}
                        </span>
                      </td>

                      {/* Thao tác (Actions: View, Edit, Enable/Disable, Delete) */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          {/* View Preview */}
                          <button
                            onClick={() => setPreviewCampaign(camp)}
                            title="Xem chi tiết"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Xem
                          </button>

                          {/* Edit */}
                          <Link to={`/admin/sales/${camp.id}/edit`}>
                            <button
                              title="Chỉnh sửa chương trình"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Sửa
                            </button>
                          </Link>

                          {/* Enable / Disable */}
                          <button
                            onClick={() => handleToggleStatus(camp.id)}
                            title={isCampActive ? 'Tạm dừng chiến dịch' : 'Kích hoạt chiến dịch'}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: isCampActive ? '1px solid #fed7aa' : '1px solid #bbf7d0',
                              backgroundColor: isCampActive ? '#fff7ed' : '#f0fdf4',
                              color: isCampActive ? '#c2410c' : '#166534',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {isCampActive ? '⏸️ Tắt' : '▶️ Bật'}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(camp.id, camp.name)}
                            title="Xóa chiến dịch"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* REUSABLE PAGINATION */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCampaigns.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 10, 20, 50]}
            unitName="chiến dịch"
          />
          </>
        )}
      </div>

      {/* 6. PREVIEW MODAL */}
      {previewCampaign && (
        <Modal
          isOpen={Boolean(previewCampaign)}
          onClose={() => setPreviewCampaign(null)}
          title={`Chi tiết chiến dịch: ${previewCampaign.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ height: '140px', borderRadius: '10px', overflow: 'hidden' }}>
              <img
                src={previewCampaign.bannerUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {previewCampaign.name} ({previewCampaign.code})
              </div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {previewCampaign.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Trạng thái:</span>
                <div style={{ fontWeight: 700, color: '#2563eb' }}>{previewCampaign.status}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Kênh phân phối:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{previewCampaign.channel}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Doanh thu ghi nhận:</span>
                <div style={{ fontWeight: 800, color: '#dc2626' }}>{formatCurrency(previewCampaign.revenue || 0)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tiến độ bán:</span>
                <div style={{ fontWeight: 800, color: '#16a34a' }}>{previewCampaign.percentSold}% ({previewCampaign.soldQuantity}/{previewCampaign.targetQuantity})</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Link to="/flash-sale">
                <Button variant="outline" size="sm">
                  Xem trên trang Khách Hàng ➔
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={() => setPreviewCampaign(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminSales;
