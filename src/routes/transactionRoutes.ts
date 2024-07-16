import express from 'express';
import * as transactionController from '../controllers/transactionController';

const router = express.Router();

router.get('/token/:tokenId', transactionController.getTransactionsByTokenId);
router.get('/address/:address', transactionController.getTransactionsByAddress);

export default router;