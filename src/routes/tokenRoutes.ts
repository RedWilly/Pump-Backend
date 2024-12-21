import express from 'express';
import * as tokenController from '../controllers/tokenController';
import { generateSitemap } from '../controllers/sitemapController';
import cors from 'cors';

const router = express.Router();

/** 
 * Route Definitions
 */

// Static Routes
router.get('/sitemap.xml', generateSitemap);
router.get('/search', tokenController.searchTokens);
router.get('/addresses', tokenController.getAllTokenAddresses);
router.get('/listed', tokenController.getListedTokens);
router.get('/recent', tokenController.getRecentTokens);
router.get('/with-liquidityEvent', tokenController.getTokensWithLiquidity);
router.get('/trending', tokenController.getTrendingTokens);

// Grouped Routes for '/address'
router.get('/address/:address/historical-prices', tokenController.getTokenHistoricalPrices);
router.get('/address/:address/info-and-transactions', tokenController.getTokenInfoAndTransactionsByAddress);
// router.patch('/address/:address/update', tokenController.updateTokenInfo);
router.patch('/update/:address', tokenController.updateTokenInfo);
router.get('/address/:address', tokenController.getTokenByAddress);

// Creator Routes
router.get('/creator/:creatorAddress', tokenController.getTokensByCreator);

// Dynamic Routes
router.get('/:id', tokenController.getTokenById);

// Default Route
router.get('/', tokenController.getAllTokens);

export default router;
