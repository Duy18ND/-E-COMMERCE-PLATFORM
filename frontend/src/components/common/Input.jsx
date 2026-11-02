import { useState } from 'react';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  required = false,
  className = '',
  leftIcon = null,
  rightElement = null,
  containerStyle = {},
  inputStyle = {},
  onFocus,
  onBlur,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const inputId = id || name;

  const handleFocus = (e) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  const borderColor = error
    ? '#dc2626'
    : focused
      ? '#2563eb'
      : '#cbd5e1';

  const boxShadow = error
    ? '0 0 0 3px rgba(220, 38, 38, 0.1)'
    : focused
      ? '0 0 0 3px rgba(37, 99, 235, 0.12)'
      : 'none';

  return (
    <div className="form-field-group" style={{ marginBottom: '1rem', width: '100%', minWidth: 0, ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: '0.4rem',
            fontSize: '0.84rem',
            fontWeight: 600,
            color: '#1e293b',
            lineHeight: 1.35
          }}
        >
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      <div
        className={`input-control-wrap ${focused ? 'is-focused' : ''} ${error ? 'has-error' : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minWidth: 0,
          borderRadius: '0.625rem',
          border: `1px solid ${borderColor}`,
          backgroundColor: '#ffffff',
          boxShadow,
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease'
        }}
      >
        {leftIcon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '0.85rem',
              color: error ? '#dc2626' : focused ? '#2563eb' : '#94a3b8',
              flexShrink: 0,
              pointerEvents: 'none',
              transition: 'color 0.18s ease'
            }}
          >
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          style={{
            width: '100%',
            minWidth: 0,
            padding: leftIcon
              ? rightElement
                ? '0.68rem 0.5rem 0.68rem 0.6rem'
                : '0.68rem 0.85rem 0.68rem 0.6rem'
              : rightElement
                ? '0.68rem 0.5rem 0.68rem 0.85rem'
                : '0.62rem 0.85rem',
            fontSize: '0.925rem',
            borderRadius: '0.625rem',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: '#0f172a',
            ...inputStyle
          }}
          className={className}
          {...props}
        />

        {rightElement && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingRight: '0.65rem',
              flexShrink: 0
            }}
          >
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <span
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            marginTop: '0.32rem',
            fontSize: '0.76rem',
            fontWeight: 500,
            color: '#dc2626',
            lineHeight: 1.35
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </span>
      )}
    </div>
  );
};

export default Input;
