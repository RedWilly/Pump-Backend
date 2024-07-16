import express from 'express';
import * as liquidityController from '../controllers/liquidityController';

const router = express.Router();

router.get('/token/:tokenId', liquidityController.getLiquidityEventsByTokenId);

export default router;