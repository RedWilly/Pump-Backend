import express from 'express';
import * as priceController from '../controllers/priceController';

const router = express.Router();

router.get('/supported-chains', priceController.getSupportedChains);
router.get('/:chain/price', priceController.getPrice);

export default router;