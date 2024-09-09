import express from 'express';
import * as tokenController from '../controllers/tokenController';

const router = express.Router();

router.get('/search', tokenController.searchTokens);

router.get('/addresses', tokenController.getAllTokenAddresses);
router.patch('/update/:address', tokenController.updateTokenInfo);
router.get('/address/:address/historical-prices', tokenController.getTokenHistoricalPrices);
router.get('/address/:address/info-and-transactions', tokenController.getTokenInfoAndTransactionsByAddress);

router.get('/recent', tokenController.getRecentTokens); // Move this line up
router.get('/with-liquidityEvent', tokenController.getTokensWithLiquidity);
router.get('/address/:address', tokenController.getTokenByAddress);
router.get('/', tokenController.getAllTokens);
router.get('/:id', tokenController.getTokenById); // Move this line down

router.get('/creator/:creatorAddress', tokenController.getTokensByCreator);

export default router;