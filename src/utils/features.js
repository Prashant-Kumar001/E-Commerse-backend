import Product from "../models/product.js";
import AppError from "./appError.js";
import { cache } from "../../index.js";

export const invalidateCache = async ({
    product,
    order,
    admin,
    userId,
    orderId,
}) => {
    if (product) {
        cache.del("latestProduct");
        cache.del("category");
        cache.del("all-product");
    }
    if (order) {
        const ordersKeys = [`all-orders`, `my-orders-${userId}`, `single-order-${orderId}`];
        ordersKeys.forEach((key) => cache.del(key));
    }

    if (admin) {
        const adminKeys = ["admin-stats", "admin-bar-chart", "admin-pie-chart", "admin-line-chart"];
        adminKeys.forEach((key) => cache.del(key));
    }

};

export const decreaseStock = async (orderItems) => {
    for (const item of orderItems) {
        try {
            const product = await Product.findById(item._id);
            if (!product) {
                throw new AppError("Product not found", 404);
            }
            console.log("Product found:", product.name);
            product.stock -= item.quantity;
            await product.save({ validateBeforeSave: false });

        } catch (error) {
            throw new AppError("Error updating stock", 500);
        }
    }
};


export const parseValidity = (validity) => {
    const unit = validity.slice(-1);
    const value = parseInt(validity.slice(0, -1));

    let milliseconds = 0;
    if (unit === 'd') milliseconds = value * 24 * 60 * 60 * 1000;
    if (unit === 'h') milliseconds = value * 60 * 60 * 1000;
    if (unit === 'm') milliseconds = value * 60 * 1000;

    return milliseconds;
};

export const isCouponValid = (coupon) => {
    const expirationTime = new Date(coupon.createdAt).getTime() + parseValidity(coupon.validity);
    return Date.now() <= expirationTime;
};


