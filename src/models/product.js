import mongoose from "mongoose"; 

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter product name"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Please enter product price"],
    },
    description: {
      type: String,
      required: [true, "Please enter product description"],
    },
    image: {
      type: String,
      required: [true, "Please upload product image"],
    },
    stock: {
      type: Number,
      required: [true, "Please enter product stock"],
    },
    category: {
      type: String,
      lowercase: true,
      required: [true, "Please select product category"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },

  },

);

export default mongoose.model("Product", productSchema);
