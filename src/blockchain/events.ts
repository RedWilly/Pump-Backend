import { createPublicClient, http, PublicClient } from 'viem';
import { broadcastUpdate } from '../app';
import { createToken, getTokenByAddress, updateToken } from '../services/tokenService';
import { createTransaction } from '../services/transactionService';
import { createLiquidityEvent } from '../services/liquidityService';
import { ABI, TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT } from './abi';
import { supportedChains, getChainConfig, ensureChainInDatabase } from './chainConfig';
import logger from '../utils/logger';

function calculateTokenPrice(ethAmount: bigint, tokenAmount: bigint): string {
  const price = Number(ethAmount) / Number(tokenAmount);
  return (price * 1e18).toFixed(0);
}

const setupChainListeners = async (chainName: string, client: PublicClient) => {
  await ensureChainInDatabase(chainName);
  const chainConfig = getChainConfig(chainName);

  logger.info(`Setting up listeners for ${chainName}`);

  client.watchContractEvent({
    address: chainConfig.contractAddress,
    abi: ABI,
    eventName: TOKEN_CREATED_EVENT,
    onLogs: (logs) => handleTokenCreated(logs, chainName)
  });

  client.watchContractEvent({
    address: chainConfig.contractAddress,
    abi: ABI,
    eventName: TOKENS_BOUGHT_EVENT,
    onLogs: (logs) => handleTokensBought(logs, chainName)
  });

  client.watchContractEvent({
    address: chainConfig.contractAddress,
    abi: ABI,
    eventName: TOKENS_SOLD_EVENT,
    onLogs: (logs) => handleTokensSold(logs, chainName)
  });

  client.watchContractEvent({
    address: chainConfig.contractAddress,
    abi: ABI,
    eventName: LIQUIDITY_ADDED_EVENT,
    onLogs: (logs) => handleLiquidityAdded(logs, chainName)
  });

  logger.info(`Listeners set up for ${chainName}`);
};

export async function setupBlockchainListeners() {
  for (const [chainName, chainConfig] of Object.entries(supportedChains)) {
    logger.info(`Setting up client for ${chainName}`);
    const client = createPublicClient({
      chain: chainConfig,
      transport: http()
    });
    await setupChainListeners(chainName, client);
  }
}

async function handleTokenCreated(logs: any, chainName: string) {
  for (const log of logs) {
    logger.info(`Token created event detected on ${chainName}`);
    const { tokenAddress, creator, name, symbol } = log.args;
    const token = await createToken({
      chain: chainName,
      address: tokenAddress,
      creatorAddress: creator,
      name,
      symbol
      // logo and description are omitted and will default to empty strings
    });
    broadcastUpdate('tokenCreated', { ...token, chain: chainName });
  }
}

async function handleTokensBought(logs: any, chainName: string) {
  for (const log of logs) {
    logger.info(`Tokens bought event detected on ${chainName}`);
    const { token: tokenAddress, buyer, ethAmount, tokenAmount } = log.args;
    const token = await getTokenByAddress(chainName, tokenAddress);
    if (token) {
      const tokenPrice = calculateTokenPrice(ethAmount, tokenAmount);
      const transaction = await createTransaction({
        tokenId: token.id,
        chain: chainName,
        type: 'buy',
        senderAddress: buyer,
        recipientAddress: tokenAddress,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        tokenPrice: tokenPrice.toString(),
        txHash: log.transactionHash
      });
      broadcastUpdate('tokensBought', { ...transaction, chain: chainName });
    }
  }
}

async function handleTokensSold(logs: any, chainName: string) {
  for (const log of logs) {
    logger.info(`Tokens sold event detected on ${chainName}`);
    const { token: tokenAddress, seller, tokenAmount, ethAmount } = log.args;
    const token = await getTokenByAddress(chainName, tokenAddress);
    if (token) {
      const tokenPrice = calculateTokenPrice(ethAmount, tokenAmount);
      const transaction = await createTransaction({
        tokenId: token.id,
        chain: chainName,
        type: 'sell',
        senderAddress: seller,
        recipientAddress: tokenAddress,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        tokenPrice: tokenPrice.toString(), 
        txHash: log.transactionHash
      });
      broadcastUpdate('tokensSold', { ...transaction, chain: chainName });
    }
  }
}

async function handleLiquidityAdded(logs: any, chainName: string) {
  for (const log of logs) {
    logger.info(`Liquidity added event detected on ${chainName}`);
    const { token: tokenAddress, ethAmount, tokenAmount } = log.args;
    const token = await getTokenByAddress(chainName, tokenAddress);
    if (token) {
      const liquidityEvent = await createLiquidityEvent({
        tokenId: token.id,
        chain: chainName,
        ethAmount: ethAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        txHash: log.transactionHash
      });
      broadcastUpdate('liquidityAdded', { ...liquidityEvent, chain: chainName });
    }
  }
}