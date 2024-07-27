import { parseAbi } from 'viem'

export const ABI = parseAbi([
  'event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol)',
  'event TokensBought(address indexed token, address indexed buyer, uint256 ethAmount, uint256 tokenAmount)',
  'event TokensSold(address indexed token, address indexed seller, uint256 tokenAmount, uint256 ethAmount)',
  'event LiquidityAdded(address indexed token, uint256 ethAmount, uint256 tokenAmount)',
  'function getCurrentTokenPrice(address tokenAddress) view returns (uint256)'

]);


export const TOKEN_CREATED_EVENT = 'TokenCreated';
export const TOKENS_BOUGHT_EVENT = 'TokensBought';
export const TOKENS_SOLD_EVENT = 'TokensSold';
export const LIQUIDITY_ADDED_EVENT = 'LiquidityAdded';