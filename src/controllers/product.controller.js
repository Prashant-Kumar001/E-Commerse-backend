import { asyncHandler } from "../middlewares/error.js";
import Product from "../models/product.js";
import User from "../models/user.model.js";
import Review from "../models/review.js";
import AppError from "../utils/appError.js";
import { rm } from "fs";
import {
    deleteImages,
    invalidateCache,
    uploadImages,
} from "../utils/features.js";
import { radis } from "../../index.js";
import { status } from "../utils/constants.js";

const createProduct = asyncHandler(async (req, res) => {
    const { name, price, description, stock, category } = req.body;

    if (!name || !price || !description || !stock || !category) {
        if (req.files) {
            req.files.forEach((file) => {
                rm(file.path, () => {
                    console.log("File deleted successfully");
                });
            });
        }

        throw new AppError("Please fill all the fields", 400);
    }

    const images = req.files;

    if (!images || images.length === 0) {
        throw new AppError("Please upload an image", 400);
    }

    const cloudinaryResponse = await uploadImages(images);

    if (cloudinaryResponse) {
        if (images || images.length > 0) {
            images.forEach((image) => {
                rm(image.path, () => {
                    console.log(
                        `File ${image.filename} deleted after uploaded on cloudinary from server`
                    );
                });
            });
        }
    }

    const product = new Product({
        name,
        price: Number(price),
        description,
        image: cloudinaryResponse,
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
    let products;
    products = await radis.get("latestProduct");

    if (!products) {
        products = await Product.find().sort({ createdAt: -1 }).limit(5);
        await radis.set("latestProduct", JSON.stringify(products));
    } else {
        products = JSON.parse(products);
    }

    res.status(200).json({
        success: true,
        products,
    });
});
const getCategory = asyncHandler(async (req, res) => {
    let category;
    category = await radis.get("all-category");

    if (!category) {
        category = await Product.distinct("category");
        await radis.set("all-category", JSON.stringify(category));
    } else {
        category = JSON.parse(category);
    }

    res.status(200).json({
        success: true,
        category,
    });
});
const getAllProducts = asyncHandler(async (req, res) => {
    let products;
    products = await radis.get("all-products");

    if (!products) {
        products = await Product.find().sort({ createdAt: -1 });
        await radis.set("all-products", JSON.stringify(products));
    } else {
        products = JSON.parse(products);
    }

    res.status(200).json({
        success: true,
        products,
    });
});
const getAllAdminProducts = asyncHandler(async (req, res) => {
    let products;
    products = await radis.get("all-admin-products");

    if (!products) {
        products = await Product.find().sort({ createdAt: -1 });
        await radis.set("all-admin-products", JSON.stringify(products));
    } else {
        products = JSON.parse(products);
    }

    res.status(200).json({
        success: true,
        products,
    });
});

// upper functions are using Redis for caching
// lower functions are using MongoDB directly


const getSingleProduct = asyncHandler(async (req, res) => {

    // const cacheKey = `single-product-${req.params.id}`;

    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new AppError("Product not found", 404);
    }
    const reviews = await Review.find({ product: product._id });

    const averageRating =
        reviews.reduce((acc, review) => acc + review.rating, 0) /
        (reviews.length || 1);
    product.ratings = averageRating.toFixed(1);
    product.numOfReviews = reviews.length;
    await product.save();


    res.status(200).json({
        success: true,
        product,
    });
});
const updateProduct = asyncHandler(async (req, res) => {
    const { name, price, description, stock, category } = req.body;
    const { id } = req.params;
    const photos = req.files;


    const product = await Product.findById(id);
    if (!product) {
        if (photos && photos.length > 0) {
            photos.forEach((photo) => {
                rm(photo.path, () => {
                    console.log(`Local file ${photo.path} deleted (product not found)`);
                });
            });
        }
        throw new AppError("Product not found", 404);
    }

    const fieldsUpdated = [];

    if (photos && photos.length > 0) {
        const cloudinaryResponse = await uploadImages(photos);

        if (product.image && product.image.length > 0) {
            const success = await deleteImages(product.image);
            if (!success) {
                throw new AppError(
                    "Error deleting previous images from cloudinary",
                    500
                );
            }
        }

        photos.forEach((photo) => {
            rm(photo.path, () => {
                console.log(`Local file ${photo.path} deleted after upload`);
            });
        });

        product.image = cloudinaryResponse;
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

    if (fieldsUpdated.length == 0) {
        return res.status(status.BAD_REQUEST).json({
            success: false,
            message: "no field updated",
            updatedFields: fieldsUpdated,
        });
    }

    

    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        updatedFields: fieldsUpdated,
    });
});
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new AppError("Product not found", 404);
    }

    if (product.image && product.image.length > 0) {
        const success = await deleteImages(product.image);
        if (!success) {
            throw new AppError("Error deleting images from cloudinary", 500);
        }
    }

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
const postReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const userId = req.query?.id;
    const productId = req.query?.productId;

    if (![rating, comment, productId, userId].every(Boolean)) {
        throw new AppError(
            "Please provide rating, comment, productId — and be logged in.",
            400
        );
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        throw new AppError("Rating must be an integer between 1 and 5", 400);
    }

    const [userExists, productExists] = await Promise.all([
        User.exists({ _id: userId }),
        Product.findOne({ _id: productId }),
    ]);
    if (!userExists) throw new AppError("User not found", 404);
    if (!productExists) throw new AppError("Product not found", 404);

    const existingReview = await Review.findOne({
        user: userId,
        product: productId,
    });
    if (existingReview) {
        existingReview.rating = parsedRating;
        existingReview.comment = comment;
        await existingReview.save();

        const reviews = await Review.find({ product: productId });
        const averageRating =
            reviews.reduce((acc, review) => acc + review.rating, 0) /
            (reviews.length || 1);
        productExists.ratings = averageRating.toFixed(1);
        productExists.numOfReviews = reviews.length;
        await productExists.save();

        invalidateCache({ product: true, admin: true });
        return res
            .status(200)
            .json({ success: true, message: "Review updated successfully" });
    }

    await Review.create({
        user: userId,
        product: productId,
        rating: parsedRating,
        comment,
    });

    const reviews = await Review.find({ product: productId });
    const averageRating =
        reviews.reduce((acc, review) => acc + review.rating, 0) /
        (reviews.length || 1);
    productExists.ratings = averageRating.toFixed(1);
    productExists.numOfReviews = reviews.length;
    await productExists.save();

    invalidateCache({ product: true, admin: true });
    res
        .status(201)
        .json({ success: true, message: "Review created successfully" });
});
const getUserReviews = asyncHandler(async (req, res) => {
    const product = req.query?.id;

    if (!product) {
        throw new AppError("Product ID is required", 400);
    }

    const reviews = await Review.find({ product }).sort({ createdAt: -1 });

    if (!reviews || reviews.length === 0) {
        return res
            .status(200)
            .json({ success: true, message: "No reviews found for this product" });
    }

    const productReviews = await Promise.all(
        reviews.map(async (review) => {
            const user = await User.findById(review.user).select("username photo");

            return {
                _id: review._id,
                user: user ? user : null,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
            };
        })
    );

    res.status(200).json({ success: true, reviews: productReviews });
});
const getTopAllReviews = asyncHandler(async (req, res) => {

    const reviews = await Review.find().sort({ createdAt: -1 }).limit(3);

    if (!reviews || reviews.length === 0) {
        return res
            .status(200)
            .json({ success: true, message: "No reviews found for this product" });
    }

    const topReviews = await Promise.all(
        reviews.map(async (review) => {
            const user = await User.findById(review.user).select("username photo");

            return {
                _id: review._id,
                user: user ? user : null,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt,
            };
        })
    );

    res.status(200).json({ success: true, reviews: topReviews });
});
const deleteReview = asyncHandler(async (req, res) => {
    const { id: reviewId } = req.params;
    const userId = req.query?.authorId;

    if (!userId) {
        throw new AppError("User ID is required", 400);
    }

    const review = await Review.findById(reviewId);
    if (!review) {
        throw new AppError("Review not found", 404);
    }

    if (review.user.toString() !== userId) {
        throw new AppError("You can only delete your own reviews", 403);
    }

    await review.deleteOne();

    const product = await Product.findById(review.product);
    if (!product) {
        throw new AppError("Product not found", 404);
    }
    const reviews = await Review.find({ product: product._id });
    const averageRating =
        reviews.reduce((acc, review) => acc + review.rating, 0) /
        (reviews.length || 1);
    product.ratings = averageRating.toFixed(1);
    product.numOfReviews = reviews.length;
    await product.save();

    invalidateCache({ product: true, admin: true });
    res
        .status(200)
        .json({ success: true, message: "Review deleted successfully" });
});

export {
    createProduct,
    getLatestProduct,
    getCategory,
    getAllProducts,
    getAllAdminProducts,
    getSingleProduct,
    deleteProduct,
    updateProduct,
    getAllSearchProducts,
    postReview,
    getUserReviews,
    deleteReview,
    getTopAllReviews
};
