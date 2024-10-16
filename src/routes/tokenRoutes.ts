import express from 'express';
import * as tokenController from '../controllers/tokenController';

const router = express.Router();

router.get('/search', tokenController.searchTokens);

router.get('/addresses', tokenController.getAllTokenAddresses);
router.patch('/update/:address', tokenController.updateTokenInfo);
router.get('/address/:address/historical-prices', tokenController.getTokenHistoricalPrices);
router.get('/address/:address/info-and-transactions', tokenController.getTokenInfoAndTransactionsByAddress);

router.get('/listed', tokenController.getListedTokens);
router.get('/recent', tokenController.getRecentTokens); 
router.get('/with-liquidityEvent', tokenController.getTokensWithLiquidity);
router.get('/address/:address', tokenController.getTokenByAddress);
router.get('/', tokenController.getAllTokens);
router.get('/:id', tokenController.getTokenById);

router.get('/creator/:creatorAddress', tokenController.getTokensByCreator);

export default router;
