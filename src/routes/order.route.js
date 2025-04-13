import express from "express";
import {
    createOrder,
    getMyOrders,
    getAllOrders,
    getSingleOrder,
    processOrder,
    deleteOrder,
} from "../controllers/order.controller.js";
import { singleUpload } from "../middlewares/multer.js";
import { AdminOnly } from "../middlewares/Protected.js";
const router = express.Router();

router.post("/create", singleUpload, createOrder);
router.get("/my-orders", getMyOrders);
router.get("/all", AdminOnly, getAllOrders);
router.route("/:id").get(getSingleOrder).put(AdminOnly, processOrder).delete(AdminOnly, deleteOrder);

export default router;
