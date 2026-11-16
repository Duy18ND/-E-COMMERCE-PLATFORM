export const formatCurrency = (amount = 0) => {
  const numericAmount = Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(safeAmount);
};

export default formatCurrency;
