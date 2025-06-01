import { asyncHandler } from "../middlewares/error.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import { status } from "../utils/constants.js";
import { decreaseStock, invalidateCache } from "../utils/features.js";
import { radis } from "../../index.js";


export const createOrder = asyncHandler(async (req, res) => {
    const {
        user,
        orderItems,
        shippingAddress,
        subTotal,
        shippingPrice,
        taxPrice,
        delivery,
        totalPrice,
        discount,
    } = req.body;


    const missingFields = [];

    if (!orderItems) missingFields.push("orderItems");
    if (!shippingAddress) missingFields.push("shippingAddress");
    if (!user) missingFields.push("user");
    if (!subTotal) missingFields.push("subTotal");
    if (!shippingPrice) missingFields.push("shippingPrice");
    if (!taxPrice) missingFields.push("taxPrice");
    if (!totalPrice) missingFields.push("totalPrice");
    if (delivery === undefined || delivery === null)
        missingFields.push("delivery");
    if (discount === undefined || discount === null)
        missingFields.push("discount");

    if (shippingAddress) {
        const { address, city, state, country, pinCode } = shippingAddress;

        if (!address) missingFields.push("shippingAddress.address");
        if (!city) missingFields.push("shippingAddress.city");
        if (!state) missingFields.push("shippingAddress.state");
        if (!country) missingFields.push("shippingAddress.country");
        if (!pinCode) missingFields.push("shippingAddress.pinCode");
    }

    if (missingFields.length > 0) {
        throw new AppError(`Missing fields: ${missingFields.join(", ")}`, 400);
    }

    const isValidUser = await User.findById(user);
    if (!isValidUser) {
        throw new AppError("Invalid user", 400);
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
        throw new AppError("No order items found", 400);
    }

    const invalidItemIndex = orderItems.findIndex(
        (item) =>
            !item.name || !item.quantity || !item.price || !item.image || !item._id
    );

    if (invalidItemIndex !== -1) {
        throw new AppError(`Invalid order item at index ${invalidItemIndex}`, 400);
    }


    const order = await Order.create({
        orderItems: orderItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            image: item.image,
            price: item.price,
            product: item._id,
        })),
        shippingAddress,
        user,
        subTotal,
        delivery,
        shippingPrice,
        taxPrice,
        discount,
        totalPrice,
    });

    await decreaseStock(orderItems);

    invalidateCache({
        product: true,
        order: true,
        admin: true,
        userId: user,
    });

    return res.status(200).json({
        success: true,
        order,
        message: "Order placed successfully",
    });
});

export const getMyOrders = asyncHandler(async (req, res) => {
    const { id } = req.query;
    if (!id) {
        throw new AppError("invalid user id", status.BAD_REQUEST);
    }

    const user = await User.findById(id);

    if (!user) {
        throw new AppError("invalid user id", status.NOT_FOUND);
    }
    const key = `my-orders-${id}`;
    let orders;
    orders = await radis.get(key);

    if (orders) {
        orders = JSON.parse(orders);
    } else {
        orders = await Order.find({ user: id }).sort({ createdAt: -1 });
        await radis.set(key, JSON.stringify(orders));
    }

    res.status(200).json({
        success: true,
        orders,
        count: orders.length,
    });
});

export const getAllOrders = asyncHandler(async (req, res) => {
    const key = "all-orders";
    let allOrders;
    allOrders = await radis.get(key);
    if (allOrders) {
        allOrders = JSON.parse(allOrders);
    } else {
        allOrders = await Order.find().sort({ createdAt: -1 }).populate("user", "username");
        await radis.set(key, JSON.stringify(allOrders));
    }

    res.status(200).json({
        success: true,
        allOrders,
        totalOrders: allOrders.length,
    });
});

export const getSingleOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const key = `single-order-${id}`;

    let singleOrder;
    singleOrder = await radis.get(key);

    if (singleOrder) {
        singleOrder = JSON.parse(singleOrder);
    } else {
        singleOrder = await Order.findById(id).populate("user", "username");

        if (!singleOrder) {
            throw new AppError("order not found", status.NOT_FOUND);
        }

        await radis.set(key, JSON.stringify(singleOrder));
    }

    res.status(200).json({
        success: true,
        singleOrder,
    });
});


//upper functions are redis cache enabled
//lower functions are not redis cache enabled


export const processOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
        throw new AppError("order not found", status.NOT_FOUND);
    }

    switch (order.status) {
        case "PENDING":
            order.status = "PROCESSING";
            break;
        case "PROCESSING":
            order.status = "SHIPPED";
            break;
        case "SHIPPED":
            order.status = "DELIVERED";
            order.deliveredAt = Date.now();
            order.isDelivered = true;
            break;
        case "DELIVERED":
        case "CANCELLED":
            throw new AppError(
                `Order is already completed and cannot be updated further, ${order.status} `,
                status.BAD_REQUEST
            );
        default:
            throw new AppError("Invalid order status.", status.BAD_REQUEST);
    }

    await order.save();

    invalidateCache({
        product: false,
        order: true,
        admin: true,
        userId: order.user,
        orderId: order._id,
    });

    res.status(200).json({
        success: true,
        message: `Order status updated to ${order.status}`,
    });
});

export const deleteOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
        throw new AppError("order not found", status.NOT_FOUND);
    }

    invalidateCache({
        product: false,
        order: true,
        admin: true,
        userId: order.user,
        orderId: order._id,
    });

    await order.deleteOne();

    res.status(200).json({
        success: true,
        message: "order deleted successfully",
    });
});
