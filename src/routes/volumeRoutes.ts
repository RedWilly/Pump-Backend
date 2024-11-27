import express from 'express';
import * as volumeController from '../controllers/volumeController';

const router = express.Router();

router.get('/total', volumeController.getTotalVolume);
router.get('/range', volumeController.getVolumeByTimeRange);

export default router; 