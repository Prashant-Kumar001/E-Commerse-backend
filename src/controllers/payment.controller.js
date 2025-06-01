import { asyncHandler } from "../middlewares/error.js";
import Coupon from "../models/coupon.model.js";
import AppError from "../utils/appError.js";
import { status } from "../utils/constants.js";
import { isCouponValid, parseValidity, getExpiryDate } from "../utils/features.js";
import { stripe } from "../../index.js";
import mongoose from "mongoose";

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

    if (!/^[A-Z0-9]+$/.test(code)) {
        return res.status(400).json({
            message: "❌ Invalid coupon code",
        });
    }
    if (discount <= 0) {
        return res.status(400).json({
            message: "❌ Discount must be greater than 0",
        });
    }
    const unit = validity.slice(-1);
    const value = parseInt(validity.slice(0, -1));


    if (unit !== "d" && unit !== "h" && unit !== "m") {
        return res.status(400).json({
            message: "❌ Validity must be in the format of 'Xd', 'Xh', or 'Xm'",
        });
    }

    if (isNaN(value) || value <= 0) {
        return res.status(400).json({
            message: "❌ Validity must be start with positive number",
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

    const expirationTime = new Date(newCoupon.createdAt).getTime() + parseValidity(validity);
    const readableExpiry = new Date(expirationTime).toLocaleString();

    res.status(201).json({
        message: "✅ Coupon created successfully!",
        newCoupon,
        expiresAt: readableExpiry,
    });
});


export const applyCoupon = asyncHandler(async (req, res) => {
    const { code, id } = req.query;

    if (!code || !id) {
        return res.status(400).json({
            message: "Missing required parameters",
            success: false,
        });
    }

    const coupon = await Coupon.findOne({ code });


    if (!coupon) {
        return res.status(404).json({
            message: "❌ Coupon not found",
            success: false,
        });
    }

    if (!coupon.isActive || !isCouponValid(coupon)) {
        return res.status(400).json({
            message: "❌ Coupon expired or inactive",
            success: false,
        });
    }

    if (coupon.applied.includes(id)) {
        return res.status(400).json({
            message: "Coupon already used by this user",
            success: false,
        });
    }


    if (coupon.count > 0) {
        coupon.count -= 1;
        if (coupon.count === 0) {
            coupon.isActive = false;
        }
    } else {
        coupon.isActive = false;
        return res.status(400).json({
            message: "❌ Coupon usage limit reached",
            success: false,
        });
    }

    coupon.applied.push(id);
    await coupon.save();

    res.json({
        message: "✅ Coupon applied successfully!",
        discountAmount: coupon.discount,
        success: true,
    });
});

export const updateCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, discount, validity, count } = req.body;

    if (!code || !discount || !validity) {
        return res.status(400).json({
            message: "❌ All fields (code, discount, validity) are required",
        });
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
        return res.status(400).json({
            message: "❌ Invalid coupon code",
        });
    }
    if (discount <= 0) {
        return res.status(400).json({
            message: "❌ Discount must be greater than 0",
        });
    }
    const unit = validity.slice(-1);
    const value = parseInt(validity.slice(0, -1));

    if (unit !== "d" && unit !== "h" && unit !== "m") {
        return res.status(400).json({
            message: "❌ Validity must be in the format of 'Xd', 'Xh', or 'Xm'",
        });
    }

    if (isNaN(value) || value <= 0) {
        return res.status(400).json({
            message: "❌ Validity must start with a positive number",
        });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
        return res.status(404).json({
            message: "❌ Coupon not found",
        });
    }

    coupon.code = code;
    coupon.discount = discount;
    coupon.validity = validity;
    coupon.count = count;

    await coupon.save();

    res.status(200).json({
        success: true,
        message: "✅ Coupon updated successfully!",
        coupon,
    });
});


export const allCoupon = asyncHandler(async (req, res) => {
    const { active } = req.query;
    const now = new Date();


    const rawCoupons = await Coupon.find({}).lean();


    let coupons = rawCoupons.map(c => {
        const expiresAt = getExpiryDate(c.createdAt, c.validity);
        const isActiveNow = expiresAt >= now;

        return {
            _id: c._id,
            code: c.code,
            discount: c.discount,
            validity: c.validity,
            count: c.count,
            isActiveNow,
        };
    });


    if (active !== undefined) {
        const wantActive = active === 'true';
        coupons = coupons.filter(c => c.isActiveNow === wantActive);
    }


    res.json({
        success: true,
        coupons,
        message: coupons.length
            ? active === undefined
                ? 'ACTIVE AND INACTIVE COUPONS'
                : active === 'true'
                    ? 'ACTIVE COUPONS'
                    : 'INACTIVE COUPONS'
            : 'No coupons found',
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
