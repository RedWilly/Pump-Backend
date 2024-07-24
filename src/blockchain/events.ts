import { createPublicClient, http, PublicClient, Address, ContractFunctionExecutionError } from 'viem';
import { broadcastUpdate } from '../app';
import { createToken, getTokenByAddress } from '../services/tokenService';
import { createTransaction } from '../services/transactionService';
import { createLiquidityEvent } from '../services/liquidityService';
import { ABI, TOKEN_CREATED_EVENT, TOKENS_BOUGHT_EVENT, TOKENS_SOLD_EVENT, LIQUIDITY_ADDED_EVENT } from './abi';
import { supportedChains, getChainConfig, ensureChainInDatabase, ChainConfig } from './chainConfig';
import logger from '../utils/logger';

// Helper function to safely stringify BigInt values
function safeStringify(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

async function getCurrentTokenPrice(
  client: PublicClient, 
  chainConfig: ChainConfig, 
  tokenAddress: Address,
  blockNumber: bigint
): Promise<bigint | null> {
  try {
    const price = await client.readContract({
      address: chainConfig.contractAddress,
      abi: ABI,
      functionName: 'getCurrentTokenPrice',
      args: [tokenAddress],
      blockNumber
    });
    return price;
  } catch (error) {
    if (error instanceof ContractFunctionExecutionError) {
      logger.warn(`Contract execution reverted when fetching price for token ${tokenAddress}. This might be due to all tokens being sold or a contract state issue.`);
      return null;
    }
    logger.error(`Error fetching current token price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function handleTokenCreated(logs: any, chainName: string) {
  for (const log of logs) {
    try {
      logger.info(`Token created event detected on ${chainName}`);
      const { tokenAddress, creator, name, symbol } = log.args;
      const token = await createToken({
        chain: chainName,
        address: tokenAddress,
        creatorAddress: creator,
        name,
        symbol,
      });
      broadcastUpdate('tokenCreated', { ...token, chain: chainName });
    } catch (error) {
      logger.error(`Error processing token created event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error(`Event data: ${safeStringify(log)}`);
    }
  }
}

async function handleTokensBought(logs: any, chainName: string, client: PublicClient) {
  const chainConfig = getChainConfig(chainName);
  for (const log of logs) {
    try {
      logger.info(`Processing tokens bought event on ${chainName}. Transaction hash: ${log.transactionHash}`);
      const { token: tokenAddress, buyer, ethAmount, tokenAmount } = log.args;
      
      logger.info(`Fetching token details for address: ${tokenAddress}`);
      const token = await getTokenByAddress(chainName, tokenAddress);
      
      if (token) {
        logger.info(`Token found: ${token.id}`);
        
        logger.info(`Fetching current token price from blockchain`);
        const tokenPrice = await getCurrentTokenPrice(client, chainConfig, tokenAddress, BigInt(log.blockNumber));
        
        let priceToUse = tokenPrice !== null ? tokenPrice.toString() : '0';
        
        logger.info(`Creating transaction record. Buyer: ${buyer}, Amount: ${ethAmount.toString()} ETH / ${tokenAmount.toString()} tokens, Price: ${priceToUse}`);
        const transaction = await createTransaction({
          tokenId: token.id,
          chain: chainName,
          type: 'buy',
          senderAddress: buyer,
          recipientAddress: tokenAddress,
          ethAmount: ethAmount.toString(),
          tokenAmount: tokenAmount.toString(),
          tokenPrice: priceToUse,
          txHash: log.transactionHash
        });
        
        logger.info(`Transaction record created successfully. Transaction ID: ${transaction.id}`);
        broadcastUpdate('tokensBought', { ...transaction, chain: chainName });
      } else {
        logger.error(`Token not found for address: ${tokenAddress}`);
      }
    } catch (error) {
      logger.error(`Error processing tokens bought event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error(`Event data: ${safeStringify(log)}`);
    }
  }
}

async function handleTokensSold(logs: any, chainName: string, client: PublicClient) {
  const chainConfig = getChainConfig(chainName);
  for (const log of logs) {
    try {
      logger.info(`Processing tokens sold event on ${chainName}. Transaction hash: ${log.transactionHash}`);
      const { token: tokenAddress, seller, tokenAmount, ethAmount } = log.args;
      
      logger.info(`Fetching token details for address: ${tokenAddress}`);
      const token = await getTokenByAddress(chainName, tokenAddress);
      
      if (token) {
        logger.info(`Token found: ${token.id}`);
        
        logger.info(`Fetching current token price from blockchain`);
        const tokenPrice = await getCurrentTokenPrice(client, chainConfig, tokenAddress, BigInt(log.blockNumber));
        
        let priceToUse = tokenPrice !== null ? tokenPrice.toString() : '0';
        
        logger.info(`Creating transaction record. Seller: ${seller}, Amount: ${tokenAmount.toString()} tokens / ${ethAmount.toString()} ETH, Price: ${priceToUse}`);
        const transaction = await createTransaction({
          tokenId: token.id,
          chain: chainName,
          type: 'sell',
          senderAddress: seller,
          recipientAddress: tokenAddress,
          ethAmount: ethAmount.toString(),
          tokenAmount: tokenAmount.toString(),
          tokenPrice: priceToUse,
          txHash: log.transactionHash
        });
        
        logger.info(`Transaction record created successfully. Transaction ID: ${transaction.id}`);
        broadcastUpdate('tokensSold', { ...transaction, chain: chainName });
      } else {
        logger.error(`Token not found for address: ${tokenAddress}`);
      }
    } catch (error) {
      logger.error(`Error processing tokens sold event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error(`Event data: ${safeStringify(log)}`);
    }
  }
}

async function handleLiquidityAdded(logs: any, chainName: string) {
  for (const log of logs) {
    try {
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
      } else {
        logger.error(`Token not found for address: ${tokenAddress}`);
      }
    } catch (error) {
      logger.error(`Error processing liquidity added event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error(`Event data: ${safeStringify(log)}`);
    }
  }
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
    onLogs: (logs) => handleTokensBought(logs, chainName, client)
  });

  client.watchContractEvent({
    address: chainConfig.contractAddress,
    abi: ABI,
    eventName: TOKENS_SOLD_EVENT,
    onLogs: (logs) => handleTokensSold(logs, chainName, client)
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