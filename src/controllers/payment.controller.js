import { asyncHandler } from "../middlewares/error.js";
import Coupon from "../models/coupon.model.js";
import AppError from "../utils/appError.js";
import { status } from "../utils/constants.js";
import { isCouponValid, parseValidity } from "../utils/features.js";
import { stripe } from "../../index.js";

export const createPayment = asyncHandler(async (req, res) => {
    const { amount } = req.body;


    if (!amount) {
        throw new AppError("Amount is required", status.BAD_REQUEST);
    }

    const payment = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: "INR",
        payment_method_types: ["card"], 
    });

    res.status(200).json({
        success: true,
        client_secret: payment.client_secret,
    }); 
});

export const createCoupon = asyncHandler(async (req, res) => {
    const { code, discount, validity, count } = req.body;

    if (!code || !discount || !validity) {
        return res.status(400).json({
            message: "❌ All fields (code, discount, validity) are required",
        });
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
        return res.status(400).json({
            message: "Coupon code already exists",
        });
    }

    const newCoupon = new Coupon({
        code,
        discount,
        validity,
        isActive: true,
        count,
        createdAt: new Date(),
    });

    await newCoupon.save();

    const expirationTime =
        new Date(newCoupon.createdAt).getTime() + parseValidity(validity);
    const readableExpiry = new Date(expirationTime).toLocaleString();

    res.status(201).json({
        message: "✅ Coupon created successfully!",
        newCoupon,
        expiresAt: readableExpiry,
    });
});

export const applyCoupon = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
        return res
            .status(404)
            .json({ message: "❌ Coupon not found", success: false });
    }

    const expirationTime =
        new Date(coupon.createdAt).getTime() + parseValidity(coupon.validity);

    if (!coupon.isActive || !isCouponValid(coupon)) {
        return res.status(400).json({
            message: "Coupon expired or already used",
            success: false,
        });
    }

    if (coupon.count >= 1) {
        coupon.count -= 1;
        if (coupon.count === 0) {
            coupon.isActive = false;
        }
    } else {
        coupon.isActive = false;
    }

    await coupon.save();

    res.json({
        message: "✅ Coupon applied successfully!",
        discountAmount: coupon.discount,
        success: true,
    });
});

export const allCoupon = asyncHandler(async (req, res) => {
    const { active } = req.query;
    let coupons = [];
    const query = {};

    if (active) {
        query.isActive = active === "true" ? true : false;
    }

    coupons = await Coupon.find(query);
    res.json({
        success: true,
        coupons,
        message: coupons.length
            ? "ACTIVE AND INACTIVE COUPONS"
            : "No coupons found",
    });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
        throw new AppError("Coupon not found", status.NOT_FOUND);
    }
    res.status(200).json({
        success: true,
        message: "Coupon deleted successfully",
    });
});
