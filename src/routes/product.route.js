import express from "express";
const router = express.Router();
import {
  createProduct,
  getLatestProduct,
  getCategory,
  getSingleProduct,
  deleteProduct,
  updateProduct,
  getAllSearchProducts,
  getAllProducts,
  getAllAdminProducts,
  postReview,
  deleteReview,
  getUserReviews,
  getTopAllReviews
} from "../controllers/product.controller.js";
import { AdminOnly } from "../middlewares/Protected.js";
import { multipleUpload } from "../middlewares/multer.js";

router.post("/create", AdminOnly, multipleUpload, createProduct);
router.get("/latest", getLatestProduct);
router.get("/category", getCategory);
router.get("/products", getAllProducts);
router.get("/all", AdminOnly, getAllAdminProducts);
router.get("/my", getAllSearchProducts);
router.get("/reviews", getUserReviews);
router.get("/top-reviews", getTopAllReviews);
router.post("/review/new", postReview);
router.delete("/review/:id", deleteReview);
router
  .route("/:id")
  .get(getSingleProduct)
  .put(AdminOnly, multipleUpload, updateProduct)
  .delete(AdminOnly, deleteProduct);

export default router;
