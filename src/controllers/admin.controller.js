import { asyncHandler } from "../middlewares/error.js";
import AppError from "../utils/appError.js";
import { radis } from "../../index.js";
import {
    calculateGrowthRate,
    getDateRanges,
    getLastMonth,
    calculatePercentage
} from "../utils/helper.js";

import product from "../models/product.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import { REDIS_TTL } from "../utils/constants.js";

export const getDashboardStats = asyncHandler(async (req, res) => {



    let stats;
    stats = await radis.get("admin-stats");



    if (!stats) {
        const { currentMonth, previousMonth, lastSixMonths } = getDateRanges();

        const [
            currentMonthProductStats,
            previousMonthProductStats,
            currentMonthUserCount,
            previousMonthUserCount,
            currentMonthOrderStats,
            previousMonthOrderStats,
            lastSixMonthsOrderStats,
            lifetimeUsers,
            lifetimeProducts,
            lifetimeRevenue,
            lifetimeOrders,
            categories,
            gender,
            firstFiveTransactions,
        ] = await Promise.all([
            product.aggregate([
                {
                    $match: {
                        createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: "$price" },
                        totalCount: { $sum: 1 },
                    },
                },
            ]),
            product.aggregate([
                {
                    $match: {
                        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: "$price" },
                        totalCount: { $sum: 1 },
                    },
                },
            ]),
            User.countDocuments({
                createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
            }),
            User.countDocuments({
                createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
            }),
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: currentMonth.start, $lte: currentMonth.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$totalPrice" },
                        totalOrders: { $sum: 1 },
                    },
                },
            ]),
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: previousMonth.start, $lte: previousMonth.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$totalPrice" },
                        totalOrders: { $sum: 1 },
                    },
                },
            ]),
            Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastSixMonths[lastSixMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        revenue: { $sum: "$totalPrice" },
                        totalOrders: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
            User.countDocuments({}),
            product.countDocuments({}),
            Order.aggregate([
                { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
            ]),
            Order.countDocuments({}),
            product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
            User.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
            Order.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .select("totalPrice orderItems discount status"),
        ]);
        const currentMonthProductData = currentMonthProductStats[0] || {
            totalValue: 0,
            totalCount: 0,
        };
        const previousMonthProductData = previousMonthProductStats[0] || {
            totalValue: 0,
            totalCount: 0,
        };
        const currentMonthOrderData = currentMonthOrderStats[0] || {
            revenue: 0,
            totalOrders: 0,
        };
        const previousMonthOrderData = previousMonthOrderStats[0] || {
            revenue: 0,
            totalOrders: 0,
        };
        const lifetimeRevenueData = lifetimeRevenue[0] || { totalRevenue: 0 };
        const sixMonthRevenueTrend = lastSixMonths.map((range) => {
            const monthData = lastSixMonthsOrderStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                revenue: monthData ? monthData.revenue : 0,
            };
        });
        const sixMonthOrderTrend = lastSixMonths.map((range) => {
            const monthData = lastSixMonthsOrderStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                orderCount: monthData ? monthData.totalOrders : 0,
            };
        });
        const LatestFiveTransactions = firstFiveTransactions.map((item) => {
            return {
                _id: item._id,
                totalPrice: Math.round(item.totalPrice),
                discount: Math.round(item.discount),
                status: item.status,
                quantity: item.orderItems.reduce(
                    (acc, orderItem) => acc + orderItem.quantity,
                    0
                ),
            };
        }).sort((a, b) => b.totalPrice - a.totalPrice);
        stats = {
            currentMonth: {
                newProducts: {
                    totalValue: currentMonthProductData.totalValue,
                    count: currentMonthProductData.totalCount,
                },
                newUsers: {
                    count: currentMonthUserCount,
                },
                orders: {
                    count: currentMonthOrderData.totalOrders,
                    revenue: currentMonthOrderData.revenue,
                },
            },
            previousMonth: {
                newProducts: {
                    totalValue: previousMonthProductData.totalValue,
                    count: previousMonthProductData.totalCount,
                },
                newUsers: {
                    count: previousMonthUserCount,
                },
                orders: {
                    count: previousMonthOrderData.totalOrders,
                    revenue: previousMonthOrderData.revenue,
                },
            },
            sixMonthRevenueTrend,
            sixMonthOrderTrend,
            inventory: categories.map((category) => ({
                name: category._id,
                productPercentage: Math.round(
                    (category.count / lifetimeProducts) * 100
                ),
            })),
            gender: gender,
            firstFiveTransactions: LatestFiveTransactions,
            lifetimeStats: {
                totalUsers: lifetimeUsers,
                totalProducts: lifetimeProducts,
                totalRevenue: lifetimeRevenueData.totalRevenue,
                totalOrders: lifetimeOrders,
            },
            periods: {
                currentMonth: currentMonth.start.toLocaleString("default", {
                    month: "long",
                }),
                previousMonth: previousMonth.start.toLocaleString("default", {
                    month: "long",
                }),
            },
            growthPercentage: {
                products: calculateGrowthRate(
                    currentMonthProductData.totalCount,
                    previousMonthProductData.totalCount,
                    "products"
                ),
                users: calculateGrowthRate(
                    currentMonthUserCount,
                    previousMonthUserCount,
                    "users"
                ),
                orders: calculateGrowthRate(
                    currentMonthOrderData.totalOrders,
                    previousMonthOrderData.totalOrders,
                    "orders"
                ),
                revenue: calculateGrowthRate(
                    currentMonthOrderData.revenue,
                    previousMonthOrderData.revenue,
                    "revenue"
                ),

            },
            growthRate: {
                products: calculatePercentage(
                    currentMonthProductData.totalCount,
                    previousMonthProductData.totalCount,
                ),
                users: calculatePercentage(
                    currentMonthUserCount,
                    previousMonthUserCount,
                ),
                orders: calculatePercentage(
                    currentMonthOrderData.totalOrders,
                    previousMonthOrderData.totalOrders,
                ),
                revenue: calculatePercentage(
                    currentMonthOrderData.revenue,
                    previousMonthOrderData.revenue,
                ),
            },
        };
        await radis.setex("admin-stats", 14400, JSON.stringify(stats));
    } else {
        stats = JSON.parse(stats);
    }
    res.status(200).json({
        success: true,
        stats,
    });
});

export const getBarChat = asyncHandler(async (req, res) => {
    let chart;
    chart = await radis.get("admin-bar-chart");

    if (!chart) {
        const { lastSixMonths } = getDateRanges();
        const lasTwelveMonth = getLastMonth(12);

        const [
            lastSixMonthsOrderStats,
            lastSixMonthsProductStats,
            lastSixMonthsUsers,
            lastTwelveMonthsOrder,
        ] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastSixMonths[lastSixMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        revenue: { $sum: "$totalPrice" },
                        totalOrders: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
            product.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastSixMonths[lastSixMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        revenue: { $sum: "$totalPrice" },
                        totalOrders: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
            User.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastSixMonths[lastSixMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        totalUsers: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
            Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lasTwelveMonth[lasTwelveMonth.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        totalOrders: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
        ]);

        const sixMonthOrders = lastSixMonths.map((range) => {
            const monthData = lastSixMonthsOrderStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                revenue: monthData ? monthData.revenue : 0,
            };
        });

        const sixMonthProducts = lastSixMonths.map((range) => {
            const monthData = lastSixMonthsProductStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                orderCount: monthData ? monthData.totalOrders : 0,
            };
        });

        const sixMonthUsers = lastSixMonths.map((range) => {
            const monthData = lastSixMonthsUsers.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                userCount: monthData ? monthData.totalUsers : 0,
            };
        });

        const twelveMonthOrders = lasTwelveMonth.map((range) => {
            const monthData = lastTwelveMonthsOrder.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                orderCount: monthData ? monthData.totalOrders : 0,
            };
        });

        chart = {
            sixMonthOrders,
            sixMonthProducts,
            sixMonthUsers,
            twelveMonthOrders,
        };

        await radis.set("admin-bar-chart", JSON.stringify(chart));
    } else {
        chart = JSON.parse(chart);
    }

    res.status(200).json({
        success: true,
        chart,
    });
});

export const getPaiChat = asyncHandler(async (req, res) => {
    let chart;
    chart = await radis.get("admin-pie-chart");

    if (!chart) {
        const [
            users,
            products,
            outOfStocks,
            status,
            categories,
            allOrders,
            allUsers,
            adminCount,
            userCount,
        ] = await Promise.all([
            User.aggregate([{ $group: { _id: "$gender", count: { $sum: 1 } } }]),
            product.countDocuments(),
            product.countDocuments({ Stock: 0 }),
            Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            product.distinct("category"),
            Order.find({}).select([
                "totalPrice",
                "discount",
                "shippingPrice",
                "taxPrice",
            ]),
            User.find({}).select(["dob"]),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "user" }),
        ]);

        const grossIncome = Math.round(
            allOrders.reduce((acc, order) => {
                return acc + order.totalPrice;
            }, 0)
        );

        const totalDiscount = Math.round(
            allOrders.reduce((acc, order) => {
                return acc + order.discount;
            }, 0)
        );

        const totalShipping = Math.round(
            allOrders.reduce((acc, order) => {
                return acc + order.shippingPrice;
            }, 0)
        );

        const totalTax = Math.round(
            allOrders.reduce((acc, order) => {
                return acc + order.taxPrice;
            }, 0)
        );

        const markingCost = Math.round(grossIncome * (30 / 100));

        const netIncome = grossIncome - totalDiscount - totalShipping - totalTax;

        const stockAvailability = {
            inStock: products - outOfStocks,
            outOfStock: outOfStocks,
        };
        const revenueDistribution = {
            grossIncome,
            totalDiscount,
            totalShipping,
            totalTax,
            markingCost,
            netIncome,
        };

        const ageDistribution = {
            "18-24": allUsers.filter((user) => user.age >= 18 && user.age < 25)
                .length,
            "25-34": allUsers.filter((user) => user.age >= 25 && user.age < 35)
                .length,
            "35-44": allUsers.filter((user) => user.age >= 35 && user.age < 45)
                .length,
            "45-54": allUsers.filter((user) => user.age >= 45 && user.age < 55)
                .length,
            "55-64": allUsers.filter((user) => user.age >= 55 && user.age < 65)
                .length,
            "65+": allUsers.filter((user) => user.age >= 65).length,
        };

        chart = {
            users,
            stockAvailability,
            status,
            categories,
            revenueDistribution,
            adminCount,
            userCount,
            ageDistribution,
        };


        await radis.set("admin-pie-chart", JSON.stringify(chart));
    } else {
        chart = JSON.parse(chart);
    }
    res.status(200).json({
        success: true,
        chart,
    });
});

export const getLineChart = asyncHandler(async (req, res) => {
    let chart = await radis.get("admin-line-chart");

    if (!chart) {
        const lastTwelveMonths = getLastMonth(12);

        const [
            orderStats,
            productStats,
            discountStats,
            revenueStats
        ] = await Promise.all([

            Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastTwelveMonths[lastTwelveMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        orderCount: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),

            product.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastTwelveMonths[lastTwelveMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        productCount: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),

            Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastTwelveMonths[lastTwelveMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        discount: { $sum: "$discount" || 0 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),

            Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: lastTwelveMonths[lastTwelveMonths.length - 1].start,
                            $lte: new Date(),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        revenue: { $sum: "$totalPrice" },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
        ]);



        const orders = lastTwelveMonths.map((range) => {
            const monthData = orderStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                orderCount: monthData ? monthData.orderCount : 0,
            };
        });

        const products = lastTwelveMonths.map((range) => {
            const monthData = productStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                productCount: monthData ? monthData.productCount : 0,
            };
        });

        const discounts = lastTwelveMonths.map((range) => {
            const monthData = discountStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                discount: monthData ? monthData.discount : 0,
            };
        });

        const revenue = lastTwelveMonths.map((range) => {
            const monthData = revenueStats.find(
                (stat) =>
                    stat._id.year === range.year &&
                    stat._id.month === range.start.getMonth() + 1
            );
            return {
                month: range.monthName,
                year: range.year,
                revenue: monthData ? monthData.revenue : 0,
            };
        });

        chart = {
            orders,
            products,
            discounts,
            revenue
        };

        await radis.set("admin-line-chart", JSON.stringify(chart));
    }else {
        chart = JSON.parse(chart);
    }

    res.status(200).json({ success: true, chart });
});