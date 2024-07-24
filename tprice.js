const ethers = require('ethers');

async function getTokenPrice() {
    // RPC URL
    const rpcUrl = 'https://rpc2.sepolia.org';

    // Create a provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Contract address
    const contractAddress = '0x4D57D3F66002Bb11096064310740b3544a2c31e6';

    // ABI for the getCurrentTokenPrice function
    const abi = [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "tokenAddress",
                    "type": "address"
                }
            ],
            "name": "getCurrentTokenPrice",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Specify the block number
    const blockNumber = 6355447;

    try {
        // Call the getCurrentTokenPrice function
        // You need to replace 'TOKEN_ADDRESS' with the actual token address you want to query
        const tokenAddress = '0xc88b9c2022f6cdd147351c194f2541b6cf225704';
        const price = await contract.getCurrentTokenPrice.staticCall(tokenAddress, { blockTag: blockNumber });

        console.log(`Token price at block ${blockNumber}:`, price.toString());
    } catch (error) {
        console.error('Error fetching token price:', error);
    }
}

getTokenPrice();