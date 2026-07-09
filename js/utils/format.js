export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('es-CO').format(num);
};

export const getUrlParam = (name) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};
