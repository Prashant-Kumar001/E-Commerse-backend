import { asyncHandler } from "../middlewares/error.js";
import Product from "../models/product.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import { rm } from "fs";
import { faker } from "@faker-js/faker";
import { cache } from "../../index.js";
import { invalidateCache } from "../utils/features.js";
import mongoose from "mongoose";

const createProduct = asyncHandler(async (req, res) => {
    const { name, price, description, stock, category } = req.body;




    if (!name || !price || !description || !stock || !category) {
        if (req.file) {
            rm(req.file.path, () => {
                console.log("File deleted successfully");
            });
        }
        throw new AppError("All fields are required", 400);
    }


    const image = req.file;
    if (!image) {
        throw new AppError("Please upload an image", 400);
    }

    const product = new Product({
        name,
        price: Number(price),
        description,
        image: req.file.path,
        stock,
        category,
    });

    invalidateCache({
        product: true,
        admin: true,
    });

    await product.save();
    res.status(201).json({ message: "Product created successfully", product });
});


const getLatestProduct = asyncHandler(async (req, res) => {
    let products = [];

    if (cache.has("latestProduct")) {
        products = JSON.parse(cache.get("latestProduct"));
    } else {
         products = await Product.find().sort({ createdAt: -1 }).limit(5);
        cache.set("latestProduct", JSON.stringify(products));
    }

    res.status(200).json({
        success: true,
        products,
    });
});


const getCategory = asyncHandler(async (req, res) => {
    let category = [];
    if (cache.has("category")) {
        category = JSON.parse(cache.get("category"));
    } else {
        category = await Product.distinct("category");
        cache.set("category", JSON.stringify(category));
    }

    res.status(200).json({
        success: true,
        category,
    });
});

const getAllProducts = asyncHandler(async (req, res) => {
    let products = [];

    if (cache.has("all-user-product")) {
        products = JSON.parse(cache.get("all-user-product"));
    } else {
        products = await Product.find();
        cache.set("all-product", JSON.stringify(products));
    }

    res.status(200).json({
        success: true,
        products,
    });
});


const getAllProduct = asyncHandler(async (req, res) => {
    let products = [];

    if (cache.has("all-product")) {
        products = JSON.parse(cache.get("all-product"));
    } else {
        products = await Product.find();
        cache.set("all-product", JSON.stringify(products));
    }

    res.status(200).json({
        success: true,
        products,
    });
});

const getSingleProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new AppError("Product not found", 404);
    }
    res.status(200).json({
        success: true,
        product,
    });
});

const updateProduct = asyncHandler(async (req, res) => {
    const { name, price, description, stock, category } = req.body;
    const { id } = req.params;
    const photo = req.file;




    const product = await Product.findById(id);
    if (!product) {
        if (photo)
            rm(photo.path, () => {
                console.log("File deleted successfully");
            });
        throw new AppError("Product not found", 404);
    }

    let fieldsUpdated = [];

    if (photo) {
        if (product.image) {
            rm(product.image, () => {
                console.log("File deleted successfully");
            });
        }
        product.image = photo.path;
        fieldsUpdated.push("image");
    }

    if (name) {
        product.name = name;
        fieldsUpdated.push("name");
    }
    if (price) {
        product.price = price;
        fieldsUpdated.push("price");
    }
    if (description) {
        product.description = description;
        fieldsUpdated.push("description");
    }
    if (stock) {
        product.stock = stock;
        fieldsUpdated.push("stock");
    }
    if (category) {
        product.category = category;
        fieldsUpdated.push("category");
    }

    if (fieldsUpdated.length > 0) {
        await product.save();
        invalidateCache({
            product: true,
            admin: true,
        });
    }

    res.status(200).json({
        success: true,
        message:
            fieldsUpdated.length > 0
                ? "Product updated successfully"
                : "No fields updated",
        updatedFields: fieldsUpdated,
        image: photo ? photo.path : product.image,
    });
});

const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new AppError("Product not found", 404);
    }
    if (product.image)
        rm(product.image, () => {
            console.log("image deleted successfully");
        });
    await product.deleteOne();

    invalidateCache({
        product: true,
        admin: true,
    });

    res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    });
});

const getAllSearchProducts = asyncHandler(async (req, res) => {
    const { search, price, category, sort } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const baseQuery = {};

    if (search) {
        baseQuery.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];
    }

    if (price) {
        baseQuery.price = { $lte: Number(price) };
    }

    if (category) {
        baseQuery.category = category;
    }

    const [products, totalCount] = await Promise.all([
        Product.find(baseQuery)
            .sort(sort ? { price: sort === "asc" ? 1 : -1 } : {})
            .skip(skip)
            .limit(limit),
        Product.countDocuments(baseQuery),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
        success: true,
        products,
        pagination: {
            totalProducts: totalCount,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            prevPage: page > 1 ? page - 1 : null,
            nextPage: page < totalPages ? page + 1 : null,
        },
    });
});

export {
    createProduct,
    getLatestProduct,
    getCategory,
    getAllProducts,
    getAllProduct,
    getSingleProduct,
    deleteProduct,
    updateProduct,
    getAllSearchProducts,
};
