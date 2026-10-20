import { useState } from 'react';
import Button from '../common/Button';

const ProductSearch = ({ onSearch, initialValue = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: '0.5rem',
        maxWidth: '500px',
        width: '100%',
        marginBottom: '1.5rem'
      }}
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Tìm kiếm sản phẩm theo tên..."
        style={{
          flex: 1,
          padding: '0.6rem 0.85rem',
          borderRadius: '0.375rem',
          border: '1px solid #cbd5e1',
          outline: 'none',
          fontSize: '0.95rem'
        }}
      />
      <Button type="submit" variant="primary">
        Tìm kiếm
      </Button>
    </form>
  );
};

export default ProductSearch;
