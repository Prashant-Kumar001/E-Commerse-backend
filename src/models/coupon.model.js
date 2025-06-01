import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
        },
        discount: {
            type: Number,
            required: true,
        },
        validity: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        count: {
            type: Number,
            default: 1,
        },
        applied: [
            {
                type: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
