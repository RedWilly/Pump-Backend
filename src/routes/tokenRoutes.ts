import express from 'express';
import * as tokenController from '../controllers/tokenController';

const router = express.Router();

router.get('/:chain/all', tokenController.getAllTokens);
router.get('/:chain/token/:id', tokenController.getTokenById);
router.get('/:chain/recent', tokenController.getRecentTokens);
router.get('/:chain/address/:address', tokenController.getTokenByAddress);
router.get('/:chain/with-liquidity', tokenController.getTokensWithLiquidity);
router.get('/:chain/info-and-transactions/:address', tokenController.getTokenInfoAndTransactionsByAddress);
router.get('/:chain/historical-prices/:address', tokenController.getTokenHistoricalPrices);
router.patch('/:chain/update/:address', tokenController.updateTokenInfo);
router.get('/:chain/addresses', tokenController.getAllTokenAddresses);
router.get('/:chain/statistics/:tokenId', tokenController.getTokenStatistics);
router.get('/:chain/top', tokenController.getTopTokens);

export default router;