import { createPublicClient, http } from 'viem';
import { shibarium } from 'viem/chains';

// Create a singleton instance of the public client
export const client = createPublicClient({
  chain: shibarium,
  transport: http()
}); 