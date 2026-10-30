import {Router} from 'express';
import {getOccupancyReport, getMovements, getAlerts} from '../controllers/reportController.js';

const router = Router();

router.get('/occupancy', getOccupancyReport);
router.get('/movements', getMovements);
router.get('/alerts', getAlerts);

export default router;