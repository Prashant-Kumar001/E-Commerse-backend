import Product from "../models/product.js";
import AppError from "./appError.js";
import cloudinary from "cloudinary";
import { rm } from "fs";
import { radis } from "../../index.js";
import { Redis } from "ioredis";
import { Console } from "console";

export const invalidateCache = async ({
    product,
    order,
    admin,
    userId,
    orderId,
}) => {
    if (product) {
        await radis.del("latestProduct");
        await radis.del("all-products");
        await radis.del("all-category");
    }

    if (order) {
        const ordersKeys = [
            "all-orders",
            `my-orders-${userId}`,
            `single-order-${orderId}`
        ];

        for (const key of ordersKeys) {
            await radis.del(key);
        }
    }

    if (admin) {
        const adminKeys = [
            "admin-stats",
            "admin-bar-chart",
            "admin-pie-chart",
            "admin-line-chart",
            "all-admin-products",
        ];


        for (const key of adminKeys) {
            await radis.del(key);
        }
    }
};


export const decreaseStock = async (orderItems) => {
    for (const item of orderItems) {
        try {
            const product = await Product.findById(item._id);
            if (!product) {
                throw new AppError("Product not found", 404);
            }
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

export const getExpiryDate = (createdAt, validity = '') => {
    const amount = parseInt(validity.slice(0, -1), 10);
    const unit = validity.slice(-1);
    const expiry = new Date(createdAt);

    switch (unit) {
        case 'd': expiry.setDate(expiry.getDate() + amount); break;
        case 'm': expiry.setMonth(expiry.getMonth() + amount); break;
        case 'h': expiry.setHours(expiry.getHours() + amount); break;
        default: return createdAt;
    }
    return expiry;
};

export const uploadImages = async (images) => {
    try {
        const uploadPromises = images.map(image =>
            cloudinary.v2.uploader.upload(image.path, {
                folder: "ecommerce",
            })
        );
        const results = await Promise.all(uploadPromises);
        return results.map(({ secure_url, public_id }) => ({ secure_url, public_id }));
    } catch (error) {
        images.forEach(image => {
            rm(image.path, () => {
                console.log(`File ${image.filename} deleted due to upload failure from server`);
            });
        });
        throw new AppError("Error uploading images", 500);
    }
};


export const deleteImages = async (images) => {
    try {
        const deletePromises = images.map(image =>
            cloudinary.v2.uploader.destroy(image.public_id)
        );

        await Promise.all(deletePromises);

        return true
    } catch (error) {
        throw new AppError("Error deleting images", 500);
    }
};


export const connectRedis = async (redisUri) => {
    const redisClient = new Redis({
        host: 'redis',  
        port: 6379,
    });

    redisClient.on("connect", () => {
        console.log("Connected to Redis");
    });
    redisClient.on("error", (err) => {
        console.error("Redis connection error:", err);
    });
    return redisClient;
};