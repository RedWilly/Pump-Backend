require('dotenv').config();
const { createPublicClient, createWalletClient, http, webSocket, parseEther, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { polygon } = require('viem/chains');

// Load environment variables
const privateKey = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = privateKeyToAccount(`0x${privateKey}`);
const address = account.address;

// Contract details
const contractAddress = '0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C';
const rawTransactionData = '0x968b3e5900000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000c3a6';

// RPC endpoints
const wssUrl = 'wss://polygon.blockpi.network/v1/ws/b29e4152e543410df30ffdb556f04d899e120729';
const httpUrl = 'https://polygon.blockpi.network/v1/rpc/b29e4152e543410df30ffdb556f04d899e120729';

// Create public client for WebSocket connections
const publicClientWs = createPublicClient({
  chain: polygon,
  transport: webSocket(wssUrl)
});

// Create public client for HTTP connections
const publicClientHttp = createPublicClient({
  chain: polygon,
  transport: http(httpUrl)
});

// Create wallet client
const walletClient = createWalletClient({
  chain: polygon,
  transport: http(httpUrl),
  account
});

// Function to estimate gas locally
function estimateGasLocally(data) {
  // Base cost for any transaction
  let baseCost = 21000n;
  
  // Cost for non-zero bytes in data
  let nonZeroBytes = BigInt(data.replace(/^0x/, '').split('').filter(char => char !== '0').length);
  let nonZeroByteCost = nonZeroBytes * 16n;
  
  // Cost for zero bytes in data
  let zeroBytes = BigInt(data.length / 2 - 1) - nonZeroBytes; // -1 for '0x'
  let zeroByteCost = zeroBytes * 4n;
  
  // Total estimated gas
  let estimatedGas = baseCost + nonZeroByteCost + zeroByteCost;
  
  // Add some buffer (20%) to account for potential underestimation
  return estimatedGas * 12n / 10n;
}

async function monitorAndSend() {
  console.log('Starting to monitor for incoming MATIC in real-time...');
  console.log('Monitoring address:', address);

  publicClientWs.watchBlocks({
    onBlock: async (block) => {
      console.log(`New block detected: ${block.number}`);
      try {
        const blockWithTransactions = await publicClientHttp.getBlock({
          blockHash: block.hash,
          includeTransactions: true
        });

        console.log(`Successfully retrieved block ${block.number} with ${blockWithTransactions.transactions.length} transactions`);

        for (const tx of blockWithTransactions.transactions) {
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            console.log(`Incoming transaction detected in block ${block.number}`);
            console.log(`Amount: ${formatEther(tx.value)} MATIC`);
            console.log(`Transaction hash: ${tx.hash}`);

            try {
              // Wait for the incoming transaction to be confirmed
              console.log('Waiting for incoming transaction to be confirmed...');
              const incomingReceipt = await publicClientHttp.waitForTransactionReceipt({ hash: tx.hash });
              console.log('Incoming transaction confirmed:', incomingReceipt.transactionHash);

              // Get the latest nonce
              const nonce = await publicClientHttp.getTransactionCount({ address });

              // Estimate gas locally
              const estimatedGas = estimateGasLocally(rawTransactionData);
              console.log('Locally estimated gas:', estimatedGas);

              // Send the new transaction
              const hash = await walletClient.sendTransaction({
                to: contractAddress,
                data: rawTransactionData,
                gasLimit: estimatedGas > 190000n ? estimatedGas : 190000n,
                maxFeePerGas: parseEther('0.00000003'),
                maxPriorityFeePerGas: parseEther('0.00000003'),
                nonce: nonce,
              });

              console.log('New transaction sent:', hash);

              const receipt = await publicClientHttp.waitForTransactionReceipt({ hash });
              console.log('New transaction confirmed:', receipt.transactionHash);
            } catch (error) {
              console.error('Error sending transaction:', error);
              if (error.message) console.error('Error message:', error.message);
              if (error.cause) console.error('Error cause:', error.cause);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing block ${block.number}:`, error);
      }
    }
  });
}

monitorAndSend().catch(console.error);