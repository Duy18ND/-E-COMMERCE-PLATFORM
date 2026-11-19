import Icon from './Icons';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  pill = true,
  disabled = false,
  loading = false,
  icon = null,
  onClick,
  className = '',
  style = {},
  ...props
}) => {
  const getPadding = () => {
    if (size === 'sm') return '0.4rem 0.85rem';
    if (size === 'lg') return '0.85rem 1.75rem';
    return '0.6rem 1.25rem';
  };

  const getFontSize = () => {
    if (size === 'sm') return '0.825rem';
    if (size === 'lg') return '1.05rem';
    return '0.925rem';
  };

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: '#1d4ed8',
          text: '#ffffff',
          border: 'none',
          shadow: '0 4px 12px rgba(29, 78, 216, 0.3)'
        };
      case 'secondary':
        return {
          bg: '#f1f5f9',
          text: '#334155',
          border: '1px solid #e2e8f0',
          shadow: 'none'
        };
      case 'outline':
        return {
          bg: '#ffffff',
          text: '#2563eb',
          border: '1.5px solid #2563eb',
          shadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
        };
      case 'danger':
        return {
          bg: '#dc2626',
          text: '#ffffff',
          border: 'none',
          shadow: '0 4px 10px rgba(220, 38, 38, 0.25)'
        };
      default:
        return {
          bg: '#1d4ed8',
          text: '#ffffff',
          border: 'none',
          shadow: '0 4px 12px rgba(29, 78, 216, 0.3)'
        };
    }
  };

  const colorStyles = getColors();

  const isDisabled = disabled || loading;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  const renderedIcon =
    typeof icon === 'string' && icon.trim() ? (
      <Icon name={icon.trim()} size={iconSize} spin={icon.trim() === 'loader'} />
    ) : (
      icon
    );

  const baseStyles = {
    padding: getPadding(),
    fontSize: getFontSize(),
    borderRadius: pill ? '9999px' : '0.625rem',
    border: colorStyles.border,
    backgroundColor: colorStyles.bg,
    color: colorStyles.text,
    boxShadow: colorStyles.shadow,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.65 : 1,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    transition:
      'transform 150ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, opacity 150ms ease',
    textDecoration: 'none',
    ...style
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      style={baseStyles}
      className={className}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = '#1e40af';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = '#1d4ed8';
          }
        }
      }}
      {...props}
    >
      {loading ? <Icon name="loader" size={15} spin /> : renderedIcon}
      {children}
    </button>
  );
};

export default Button;
