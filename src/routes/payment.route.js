import express from 'express';
const router = express.Router();
import { applyCoupon, createCoupon, allCoupon, deleteCoupon, createPayment  } from '../controllers/payment.controller.js';
import { AdminOnly } from '../middlewares/Protected.js';
router.post("/create", createPayment)
router.post('/coupon/new', AdminOnly, createCoupon);
router.post('/coupon/apply', applyCoupon);
router.get('/coupon/all', AdminOnly, allCoupon);
router.delete('/coupon/:id', AdminOnly, deleteCoupon);

export default router;  