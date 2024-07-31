export function formatNumber(num: number): string {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
  
export function formatEthAmount(ethAmount: string): string {
   return Number(ethAmount).toFixed(3);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}