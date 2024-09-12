import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { getPrice } from './services/priceService';
import { formatNumber, formatEthAmount, shortenAddress } from './utils';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in the environment variables.');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function sendTelegramMessageWithImage(message: string, imagePath: string) {
  if (!TELEGRAM_CHAT_ID) {
    console.error('TELEGRAM_CHAT_ID is not set in the environment variables.');
    return;
  }

  try {
    await bot.sendPhoto(TELEGRAM_CHAT_ID, imagePath, {
      caption: message,
      parse_mode: 'HTML'
    }, {
      contentType: 'image/jpeg'
    });
  } catch (error) {
    console.error('Error sending message with image:', error);
  }
}

function weiToEth(wei: string): number {
  return Number(wei) / 1e18;
}

function getImagePath(type: 'buy' | 'sell' | 'newToken', amount?: number): string {
  const basePath = path.join(__dirname, '..', 'images');
  
  if (type === 'newToken') {
    return path.join(basePath, 'newtoken.jpg');
  }

  if (type === 'sell') {
    return path.join(basePath, amount && amount < 0.01 ? 'sell1.jpg' : 'sell1.jpg'); //if sell amount is less than 0.01 eth, it will show the sell1 image on tg
  }

  if (type === 'buy') {
    if (amount && amount < 0.01) return path.join(basePath, 'buy1.jpg'); //if buy amount is less than 0.01 eth, it will show the buy1 image on tg, else it will show the buy2 image
    return path.join(basePath, 'buy2.jpg');
  }

  throw new Error('Invalid image type');
}

function getViewChartLink(address: string): string {
  return `<a href="https://your_url.com/token/${address}"><b><u>📊 View Chart 📊</u></b></a>`;
}

export async function sendTokenCreatedNotification(event: {
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
}) {
  const message = `
<b>🎉 New Token Launched:</b>
-----------------------
🆕 Token Name: ${event.name}
🔤 Symbol: ${event.symbol}
📍 Address: <b>${shortenAddress(event.tokenAddress)}</b>
👤 Creator: <b>${shortenAddress(event.creator)}</b>

${getViewChartLink(event.tokenAddress)}
-----------------------
`;

  await sendTelegramMessageWithImage(message, getImagePath('newToken'));
}

export async function sendTokenBuyNotification(event: {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  ethAmount: string;
  tokenAmount: string;
}) {
  const tokPrice = await getPrice();
  if (tokPrice === null) {
    console.error('Failed to fetch ETH price');
    return;
  }

  const ethAmount = weiToEth(event.ethAmount);
  const usdValue = ethAmount * parseFloat(tokPrice);
  const tokenAmount = weiToEth(event.tokenAmount);

  const message = `
<b>💹 New Buy Transaction:</b>
--------------------
🚀 ${event.tokenName} (${event.tokenSymbol})
<b>💰 Amount:</b> ${formatNumber(tokenAmount)} ${event.tokenSymbol}
<b>💸 With:</b> ${formatEthAmount(ethAmount.toString())} ETH
<b>💵 Value in USD:</b> $${formatNumber(usdValue)}

${getViewChartLink(event.tokenAddress)}
--------------------
`;

  await sendTelegramMessageWithImage(message, getImagePath('buy', ethAmount));
}

export async function sendTokenSellNotification(event: {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  ethAmount: string;
  tokenAmount: string;
}) {
  const tokPrice = await getPrice();
  if (tokPrice === null) {
    console.error('Failed to fetch ETH price');
    return;
  }

  const ethAmount = weiToEth(event.ethAmount);
  const usdValue = ethAmount * parseFloat(tokPrice);
  const tokenAmount = weiToEth(event.tokenAmount);

  const message = `
<b>📉 New Sell Transaction:</b>
---------------------
🚀 ${event.tokenName} (${event.tokenSymbol})
<b>💰 Amount:</b> ${formatNumber(tokenAmount)} ${event.tokenSymbol}
<b>💸 Received:</b> ${formatEthAmount(ethAmount.toString())} ETH
<b>💵 Value in USD:</b> $${formatNumber(usdValue)}

${getViewChartLink(event.tokenAddress)}
---------------------
`;

  await sendTelegramMessageWithImage(message, getImagePath('sell', ethAmount));
}

console.log('Telegram bot initialized successfully.');