import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: String,
            required: true,
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        rating: {
            type: Number,
            required: [true, "Please enter a rating"],
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            maxlength: [500, "Comment cannot exceed 500 characters"],
        },
    },

    {
        timestamps: true,
    }

);

export default mongoose.model("Review", reviewSchema);
