import express from 'express';
const router = express.Router();
import { applyCoupon, createCoupon, allCoupon, deleteCoupon, createPayment, updateCoupon  } from '../controllers/payment.controller.js';
import { AdminOnly } from '../middlewares/Protected.js';
router.post("/create", createPayment)
router.post('/coupon/apply', applyCoupon);

router.use(AdminOnly); // Apply AdminOnly middleware to all routes below this line
router.post('/coupon/new', createCoupon);
router.get('/coupon/all', allCoupon);
router.put('/coupon/:id', updateCoupon); // Assuming this is for updating a coupon
router.delete('/coupon/:id', deleteCoupon);

export default router;  