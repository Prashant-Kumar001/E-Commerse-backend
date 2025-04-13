import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
    },
    discount: {
        type: Number,
        required: true,
    },
    createdAt: { type: Date, default: Date.now },
    validity: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    count: {
        type: Number,
        default: 1,
    }
});

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
