export const formatINR = (amount) => {
  const num = Number(amount) || 0;
  // Use Rs. prefix as per UI requirements with Indian number grouping
  return `Rs. ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};
