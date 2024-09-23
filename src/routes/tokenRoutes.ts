import express from 'express';
import * as tokenController from '../controllers/tokenController';

const router = express.Router();

// Specific routes should come before more general ones
router.get('/ranked', tokenController.getTokensRankedByVolumeAndTrades);
router.get('/search', tokenController.searchTokens);
router.get('/addresses', tokenController.getAllTokenAddresses);
router.get('/recent', tokenController.getRecentTokens);
router.get('/with-liquidityEvent', tokenController.getTokensWithLiquidity);

// Routes with parameters
router.get('/creator/:creatorAddress', tokenController.getTokensByCreator);
router.get('/address/:address/historical-prices', tokenController.getTokenHistoricalPrices);
router.get('/address/:address/info-and-transactions', tokenController.getTokenInfoAndTransactionsByAddress);
router.get('/address/:address', tokenController.getTokenByAddress);
router.patch('/update/:address', tokenController.updateTokenInfo);

// General routes
router.get('/', tokenController.getAllTokens);
router.get('/:id', tokenController.getTokenById);

export default router;