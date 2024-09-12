import axios from 'axios';

const cacheDuration = 300000; // Cache duration for 5 minutes

let cachedPrice: string | null = null;
let lastFetchTime = 0;

async function fetchPriceFromMEXC(): Promise<string> {
    try {
        const response = await axios.get('https://www.mexc.com/open/api/v2/market/ticker?symbol=eth_usdt');
        const price = response.data.data[0].ask; // Current price from MEXC API using the 'ask' field
        return price;
    } catch (error) {
        console.error('Error fetching price from MEXC:', error);
        throw error;
    }
}

export async function getPrice(): Promise<string | null> {
    const now = Date.now();
    if (!cachedPrice || (now - lastFetchTime) > cacheDuration) {
        cachedPrice = await fetchPriceFromMEXC();
        lastFetchTime = now;
    }
    return cachedPrice;
}
