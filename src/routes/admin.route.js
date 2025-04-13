import express from 'express';
const router = express.Router();
import { AdminOnly }  from '../middlewares/Protected.js';
import { getBarChat, getDashboardStats, getLineChart, getPaiChat } from '../controllers/admin.controller.js';


router.use(AdminOnly)
router.get("/stats", getDashboardStats)
router.get("/pie", getPaiChat)
router.get("/bar", getBarChat)
router.get("/line", getLineChart)
export default router; 