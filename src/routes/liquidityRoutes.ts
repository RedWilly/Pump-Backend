import express from 'express';
import * as liquidityController from '../controllers/liquidityController';

const router = express.Router();

router.get('/:chain/token/:tokenId', liquidityController.getLiquidityEventsByTokenId);
router.get('/:chain/recent', liquidityController.getRecentLiquidityEvents);
router.get('/:chain/tx/:txHash', liquidityController.getLiquidityEventByTxHash);
router.get('/:chain/total/:tokenId', liquidityController.getTotalLiquidityForToken);
router.get('/:chain/latest/:tokenId', liquidityController.getLatestLiquidityEventForToken);
router.get('/:chain/history/:tokenId', liquidityController.getLiquidityHistory);
router.get('/:chain/top', liquidityController.getTopLiquidityTokens);
router.get('/:chain/added/:tokenId', liquidityController.getLiquidityAddedInTimeframe);

export default router;