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
  ...props
}) => {
  return (
    <div style={{ marginBottom: '1rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={id || name}
          style={{
            display: 'block',
            marginBottom: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#334155'
          }}
        >
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}
      <input
        id={id || name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          fontSize: '1rem',
          borderRadius: '0.375rem',
          border: `1px solid ${error ? '#dc2626' : '#cbd5e1'}`,
          outline: 'none',
          backgroundColor: '#ffffff'
        }}
        className={className}
        {...props}
      />
      {error && (
        <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#dc2626' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
