import express from "express";
const router = express.Router();
import {
  createProduct,
  getLatestProduct,
  getCategory,
  getAllProduct,
  getSingleProduct,
  deleteProduct,
  updateProduct,
  getAllSearchProducts,
  getAllProducts,
} from "../controllers/product.controller.js";
import { AdminOnly } from "../middlewares/Protected.js";
import { singleUpload } from "../middlewares/multer.js";

router.post("/create", AdminOnly, singleUpload, createProduct);
router.get("/latest", getLatestProduct);
router.get("/category", getCategory);
router.get("/products", getAllProducts);
router.get("/all", getAllSearchProducts);
router.get("/admin-product", AdminOnly, getAllProduct);
router
  .route("/:id")
  .get(getSingleProduct)
  .put(AdminOnly, singleUpload, updateProduct)
  .delete(AdminOnly, deleteProduct);

export default router;
