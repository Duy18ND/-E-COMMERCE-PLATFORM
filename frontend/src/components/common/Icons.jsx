import React from 'react';

const ICON_ALIASES = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info-circle',
  pending: 'clock',
  processing: 'loader',
  completed: 'check',
  cancelled: 'x',
  approved: 'shield-check',
  rejected: 'ban',
  active: 'dot',
  inactive: 'pause-circle',
  'out-of-stock': 'empty-box',
  'low-stock': 'alert-triangle',
  'in-stock': 'package-check',
  'flash-sale': 'flash',
  voucher: 'ticket',
  discount: 'percent',
  payment: 'card',
  shipping: 'truck',
  tracking: 'pin',
  close: 'x',
  cancel: 'x',
  confirm: 'check',
  next: 'arrow-right',
  back: 'arrow-left',
  filter: 'sliders'
};

const renderPaths = (name) => {
  switch (name) {
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      );
    case 'cart':
      return (
        <>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="17" cy="20" r="1.5" />
          <path d="M2.5 3.5h2.5l2.2 11a1.5 1.5 0 0 0 1.48 1.2h8.8a1.5 1.5 0 0 0 1.46-1.15L20.5 7.5H6" />
        </>
      );
    case 'cart-plus':
      return (
        <>
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="17" cy="20" r="1.5" />
          <path d="M2.5 3.5h2.5l2.2 11a1.5 1.5 0 0 0 1.48 1.2h8.8a1.5 1.5 0 0 0 1.46-1.15L20.5 7.5H6" />
          <path d="M12.5 4.5v4M10.5 6.5h4" />
        </>
      );
    case 'bag-arrow':
      return (
        <>
          <path d="M6 8h12l1 12H5L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          <path d="M9.5 14h5M12.5 11.5 15 14l-2.5 2.5" />
        </>
      );
    case 'store':
      return (
        <>
          <path d="M3 9.5 4.5 4.5h15L21 9.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-5 0Z" />
          <path d="M5 12v7.5h14V12" />
          <path d="M9.5 19.5v-5h5v5" />
        </>
      );
    case 'package':
      return (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" />
        </>
      );
    case 'box-plus':
      return (
        <>
          <path d="M12 3 4 7.5v9L12 21l3-1.7M12 3l8 4.5v4.5" />
          <path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" />
          <path d="M18 14v6M15 17h6" />
        </>
      );
    case 'empty-box':
      return (
        <>
          <path d="m3.5 8 8.5-4.5L20.5 8v8L12 20.5 3.5 16V8Z" />
          <path d="M3.5 8 12 12.5 20.5 8" />
          <path d="M12 12.5v8" />
          <path d="M9 6l6 3" />
        </>
      );
    case 'package-check':
      return (
        <>
          <path d="M12 3 4 7.5v9L12 21l2.5-1.4" />
          <path d="M12 3l8 4.5v4.5" />
          <path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" />
          <path d="m15 17.5 2 2 4-4" />
        </>
      );
    case 'edit':
      return (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M3 6h18" />
          <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
          <path d="M6 6v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
          <path d="M10 11v6M14 11v6" />
        </>
      );
    case 'save':
      return (
        <>
          <path d="M5 4h11l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V5.5A1.5 1.5 0 0 1 5.5 4Z" />
          <path d="M16 4v5H8V4" />
          <rect x="8" y="13.5" width="8" height="6.5" rx="0.5" />
        </>
      );
    case 'check':
      return <path d="m5 12.5 4.5 4.5L19 7.5" />;
    case 'x':
      return <path d="M18 6 6 18M6 6l12 12" />;
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'minus':
      return <path d="M5 12h14" />;
    case 'sliders':
      return (
        <>
          <path d="M4 7h16M4 17h16" />
          <circle cx="9" cy="7" r="2.2" fill="#ffffff" />
          <circle cx="15" cy="17" r="2.2" fill="#ffffff" />
        </>
      );
    case 'sort':
      return (
        <>
          <path d="m7 4-3 3m3-3 3 3M7 4v16" />
          <path d="m17 20-3-3m3 3 3-3M17 4v16" />
        </>
      );
    case 'refresh':
      return (
        <>
          <path d="M20 11a8 8 0 0 0-13.66-5.66L4 7.7" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 13.66 5.66L20 16.3" />
          <path d="M20 20v-4h-4" />
        </>
      );
    case 'download':
      return (
        <>
          <path d="M12 4v11M7.5 11.5 12 16l4.5-4.5" />
          <path d="M4 17.5v1.5A1.5 1.5 0 0 0 5.5 20.5h13A1.5 1.5 0 0 0 20 19v-1.5" />
        </>
      );
    case 'upload':
      return (
        <>
          <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" />
          <path d="M4 17.5v1.5A1.5 1.5 0 0 0 5.5 20.5h13A1.5 1.5 0 0 0 20 19v-1.5" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </>
      );
    case 'eye-off':
      return (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.6A10.6 10.6 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a16.7 16.7 0 0 1-3.3 4.2" />
          <path d="M6.4 6.4A16.5 16.5 0 0 0 2 12s3.8 6.5 10 6.5a10 10 0 0 0 4-.8" />
        </>
      );
    case 'bell':
      return (
        <>
          <path d="M18 8.5A6 6 0 0 0 6 8.5c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5Z" />
          <path d="M10.2 19a2 2 0 0 0 3.6 0" />
        </>
      );
    case 'user':
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </>
      );
    case 'users':
      return (
        <>
          <circle cx="9.5" cy="8.5" r="3.5" />
          <path d="M3 20a6.5 6.5 0 0 1 13 0" />
          <circle cx="17" cy="9.5" r="2.5" />
          <path d="M18 14.5a4.5 4.5 0 0 1 3.5 4.5" />
        </>
      );
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </>
      );
    case 'arrow-left':
      return (
        <>
          <path d="M19 12H5" />
          <path d="m11 6-6 6 6 6" />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
    case 'chevron-down':
      return <path d="m6 9 6 6 6-6" />;
    case 'chevron-up':
      return <path d="m6 15 6-6 6 6" />;
    case 'chevron-left':
      return <path d="m15 6-6 6 6 6" />;
    case 'chevron-right':
      return <path d="m9 6 6 6-6 6" />;
    case 'menu':
      return <path d="M4 6.5h16M4 12h16M4 17.5h16" />;
    case 'chat':
      return <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.5-5A8.5 8.5 0 1 1 21 11.5Z" />;
    case 'bot':
      return (
        <>
          <path d="M12 3v3" />
          <rect x="4" y="6" width="16" height="13" rx="4" />
          <circle cx="9.2" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="14.8" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <path d="M9 15.5h6" />
        </>
      );
    case 'qr':
      return (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
          <path d="M14 14h2.5v2.5H14zM18 14h2.5M14 19.5h6.5M18 17v2.5" />
        </>
      );
    case 'pin':
      return (
        <>
          <path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z" />
          <circle cx="12" cy="10" r="2.2" />
        </>
      );
    case 'home':
      return (
        <>
          <path d="m3 10.5 9-7.5 9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
          <path d="M9.5 20v-6h5v6" />
        </>
      );
    case 'tag':
      return (
        <>
          <path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l8.5 8.5a1.5 1.5 0 0 1 0 2.1L14.1 20a1.5 1.5 0 0 1-2.1 0L3.5 11.5Z" />
          <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
        </>
      );
    case 'layers':
      return (
        <>
          <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
          <path d="m3 12 9 4.5 9-4.5" />
          <path d="m3 16.5 9 4.5 9-4.5" />
        </>
      );
    case 'flash':
      return <path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5l1-8Z" />;
    case 'flame':
      return (
        <path d="M12.5 2.8c.5 3.3-2 4.7-2 7.2a2.5 2.5 0 0 0 5 0c0-1.1-.4-2.1-1-3 2.7 1.2 4.5 4 4.5 7A7 7 0 1 1 5 14c0-3.2 2.2-5.8 5-7.4-.2 1.2.2 2.3.9 3 .2-2.2 1-4.8 1.6-6.8Z" />
      );
    case 'ticket':
      return (
        <>
          <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" />
          <path d="M9.5 6v12" strokeDasharray="2 2.2" />
        </>
      );
    case 'percent':
      return (
        <>
          <path d="M18.5 5.5 5.5 18.5" />
          <circle cx="7.5" cy="7.5" r="2" />
          <circle cx="16.5" cy="16.5" r="2" />
        </>
      );
    case 'card':
      return (
        <>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 9.5h19M6.5 15h4" />
        </>
      );
    case 'wallet':
      return (
        <>
          <path d="M3.5 6.5A2 2 0 0 1 5.5 4.5h12.5v3" />
          <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
          <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
        </>
      );
    case 'truck':
      return (
        <>
          <path d="M2.5 6.5h11v9.5h-11z" />
          <path d="M13.5 9.5h4.2l3.3 3.5v3h-7.5" />
          <circle cx="6.5" cy="17.5" r="2" />
          <circle cx="17.5" cy="17.5" r="2" />
        </>
      );
    case 'check-circle':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="m8.2 12.2 2.6 2.6 5-5.2" />
        </>
      );
    case 'x-circle':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="m9.2 9.2 5.6 5.6m0-5.6-5.6 5.6" />
        </>
      );
    case 'alert-triangle':
      return (
        <>
          <path d="M10.4 3.9 2.7 17.5a1.8 1.8 0 0 0 1.6 2.7h15.4a1.8 1.8 0 0 0 1.6-2.7L13.6 3.9a1.8 1.8 0 0 0-3.2 0Z" />
          <path d="M12 9.5v4.5M12 16.8h.01" />
        </>
      );
    case 'info-circle':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5.5M12 8h.01" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 7v5l3.5 2" />
        </>
      );
    case 'loader':
      return (
        <path d="M12 3a9 9 0 1 0 9 9" />
      );
    case 'shield-check':
      return (
        <>
          <path d="M12 3 4.5 6.2V12c0 5 3.4 8 7.5 9.2 4.1-1.2 7.5-4.2 7.5-9.2V6.2L12 3Z" />
          <path d="m9 12.2 2.1 2.1 4-4.2" />
        </>
      );
    case 'shield':
      return <path d="M12 3 4.5 6.2V12c0 5 3.4 8 7.5 9.2 4.1-1.2 7.5-4.2 7.5-9.2V6.2L12 3Z" />;
    case 'ban':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="m5.3 5.3 13.4 13.4" />
        </>
      );
    case 'dot':
      return <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />;
    case 'pause-circle':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M10 9.2v5.6M14 9.2v5.6" />
        </>
      );
    case 'play':
      return <path d="M7.5 5.5 18.5 12l-11 6.5V5.5Z" />;
    case 'star':
      return <path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2Z" />;
    case 'star-filled':
      return (
        <path
          fill="currentColor"
          d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2Z"
        />
      );
    case 'heart':
      return (
        <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4l1.4 1.4L12 21l7.4-6.6 1.4-1.4a5.2 5.2 0 0 0 0-7.4Z" />
      );
    case 'heart-filled':
      return (
        <path
          fill="currentColor"
          d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4l1.4 1.4L12 21l7.4-6.6 1.4-1.4a5.2 5.2 0 0 0 0-7.4Z"
        />
      );
    case 'lock':
      return (
        <>
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </>
      );
    case 'unlock':
      return (
        <>
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
          <path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7" />
        </>
      );
    case 'logout':
      return (
        <>
          <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
          <path d="M15 16.5 20 12l-5-4.5M20 12H9" />
        </>
      );
    case 'history':
      return (
        <>
          <path d="M4.5 12A7.5 7.5 0 1 0 7 6.4L4.5 8.8" />
          <path d="M4.5 4.5v4.3h4.3" />
          <path d="M12 8.2v4.1l2.8 1.6" />
        </>
      );
    case 'dashboard':
    case 'chart':
      return (
        <>
          <path d="M4 19.5h16" />
          <path d="M6.5 16.5v-5M12 16.5v-10M17.5 16.5v-7.5" />
        </>
      );
    case 'trend':
      return (
        <>
          <path d="m3.5 16.5 5.5-5.5 4 4L20.5 7.5" />
          <path d="M15.5 7.5h5v5" />
        </>
      );
    case 'clipboard':
      return (
        <>
          <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
          <path d="M9 4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5v1H9v-1Z" />
          <path d="M8.5 10.5h7M8.5 14.5h5" />
        </>
      );
    case 'calendar':
      return (
        <>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 9.5h17M8 3.2v3.6M16 3.2v3.6" />
        </>
      );
    case 'phone':
      return <path d="M5.5 3.5h3.2l1.6 4-2 1.6a13 13 0 0 0 6.6 6.6l1.6-2 4 1.6v3.2a1.8 1.8 0 0 1-1.9 1.8A15.2 15.2 0 0 1 3.7 5.4 1.8 1.8 0 0 1 5.5 3.5Z" />;
    case 'mail':
      return (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="m3.5 7 8.5 6 8.5-6" />
        </>
      );
    case 'message':
      return (
        <>
          <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17.5H9l-5 3.5V7A1.5 1.5 0 0 1 5.5 5.5Z" />
          <path d="M8 10.5h8M8 13.5h5" />
        </>
      );
    case 'thumbs-up':
      return (
        <>
          <path d="M7 10.5H4v9.5h3v-9.5Z" />
          <path d="M7 19.5h9.2a2 2 0 0 0 1.9-1.4l1.6-5.2a1.6 1.6 0 0 0-1.5-2.1h-4.5l.8-4.1a1.6 1.6 0 0 0-2.9-1.1L7 10.5" />
        </>
      );
    case 'gift':
      return (
        <>
          <rect x="3.5" y="8" width="17" height="4" rx="1" />
          <path d="M5 12v8.5h14V12M12 8v12.5" />
          <path d="M12 8H9.2a2 2 0 1 1 0-4c1.8 0 2.8 2 2.8 4ZM12 8h2.8a2 2 0 1 0 0-4C13 4 12 6 12 8Z" />
        </>
      );
    case 'sparkles':
      return (
        <>
          <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
          <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
        </>
      );
    case 'image':
      return (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <circle cx="9" cy="9.5" r="1.5" />
          <path d="m4.5 17 4.8-4.8 3.2 3.2 2.8-2.8L19.5 17" />
        </>
      );
    case 'link':
      return (
        <>
          <path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l2.4-2.4a4.5 4.5 0 0 0-6.4-6.4L11 6.5" />
          <path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-2.4 2.4a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4" />
        </>
      );
    case 'copy':
      return (
        <>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 4h8a1.5 1.5 0 0 1 1.5 1.5V6" />
        </>
      );
    case 'key':
      return (
        <>
          <circle cx="8" cy="14" r="3.5" />
          <path d="M11 11.5 19.5 4M16.5 6.5l2.5 2.5M14 9l2 2" />
        </>
      );
    case 'headset':
      return (
        <>
          <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
          <rect x="3" y="13" width="3.5" height="6" rx="1.2" />
          <rect x="17.5" y="13" width="3.5" height="6" rx="1.2" />
          <path d="M20 19a3 3 0 0 1-3 2.5h-2.5" />
        </>
      );
    case 'device':
      return (
        <>
          <rect x="4" y="4.5" width="16" height="11" rx="1.5" />
          <path d="M2.5 18.5h19" />
        </>
      );
    case 'globe':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.8 12h18.4M12 2.5a13 13 0 0 1 0 19 13 13 0 0 1 0-19Z" />
        </>
      );
    case 'award':
      return (
        <>
          <circle cx="12" cy="9" r="5.5" />
          <path d="m9 14-1.2 7 4.2-2.2 4.2 2.2-1.2-7" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="4" />;
  }
};

export const Icon = ({
  name,
  size = 18,
  strokeWidth = 1.8,
  color = 'currentColor',
  className = '',
  style = {},
  spin = false,
  label,
  ...props
}) => {
  const resolvedName = ICON_ALIASES[name] || name;
  const classes = ['ui-icon', spin || resolvedName === 'loader' ? 'ui-icon-spin' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      aria-label={label || undefined}
      role={label ? 'img' : undefined}
      className={classes}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
      {...props}
    >
      {renderPaths(resolvedName)}
    </svg>
  );
};

export default Icon;
