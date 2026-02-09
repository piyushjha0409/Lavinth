// Format large numbers for readability
export const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  } else if (num < 0.001 && num > 0) {
    // For very small values (like transaction fees in SOL), show more decimal places
    return num.toFixed(8);
  } else {
    return num.toFixed(2);
  }
};

// Format wallet address for display
export const formatAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
