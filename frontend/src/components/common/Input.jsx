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
  style = {},
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
    ? '0 0 0 3px rgba(220, 38, 38, 0.12)'
    : focused
      ? '0 0 0 3px rgba(37, 99, 235, 0.15)'
      : 'none';

  return (
    <div
      className="form-field-group"
      style={{
        marginBottom: '1rem',
        width: '100%',
        minWidth: 0,
        ...style,
        ...containerStyle
      }}
    >
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
          height: '2.875rem',
          borderRadius: '0.625rem',
          border: `1.5px solid ${borderColor}`,
          backgroundColor: '#ffffff',
          boxShadow,
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          boxSizing: 'border-box'
        }}
      >
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '1.25rem',
              height: '1.25rem',
              color: error ? '#dc2626' : focused ? '#2563eb' : '#94a3b8',
              flexShrink: 0,
              pointerEvents: 'none',
              zIndex: 2,
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
            height: '100%',
            minWidth: 0,
            paddingLeft: leftIcon ? '2.625rem' : '0.875rem',
            paddingRight: rightElement ? '2.75rem' : '0.875rem',
            paddingTop: 0,
            paddingBottom: 0,
            margin: 0,
            fontSize: '0.925rem',
            borderRadius: '0.625rem',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: '#0f172a',
            boxSizing: 'border-box',
            lineHeight: '2.875rem',
            ...inputStyle
          }}
          className={className}
          {...props}
        />

        {rightElement && (
          <div
            style={{
              position: 'absolute',
              right: '0.625rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
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
            marginTop: '0.35rem',
            fontSize: '0.78rem',
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
