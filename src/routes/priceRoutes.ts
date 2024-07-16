import express from 'express';
import * as priceController from '../controllers/priceController';

const router = express.Router();

router.get('/', priceController.getCurrentPrice);

export default router;