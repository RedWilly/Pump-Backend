import express from 'express';
import * as transactionController from '../controllers/transactionController';

const router = express.Router();

router.get('/:chain/token/:tokenId', transactionController.getTransactionsByTokenId);
router.get('/:chain/address/:address', transactionController.getTransactionsByAddress);
router.get('/:chain/recent', transactionController.getRecentTransactions);
router.get('/:chain/tx/:txHash', transactionController.getTransactionByTxHash);
router.get('/:chain/volume/:tokenId', transactionController.getTransactionVolume);
router.get('/:chain/count/:tokenId', transactionController.getTransactionCount);
router.get('/:chain/price/latest/:tokenId', transactionController.getLatestTokenPrice);
router.get('/:chain/price/history/:tokenId', transactionController.getTokenPriceHistory);

export default router;