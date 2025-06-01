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
    image: [{
      secure_url: {
        type: String,
        required: [true, "Please enter product image"],
      },
      public_id: {
        type: String,
        required: [true, "Please enter product image"],
      },
    }],
    stock: {
      type: Number,
      required: [true, "Please enter product stock"],
    },
    category: {
      type: String,
      lowercase: true,
      required: [true, "Please select product category"],
    },
    ratings: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }

);

export default mongoose.model("Product", productSchema);
