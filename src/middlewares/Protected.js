import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import { asyncHandler } from "./error.js";

export const AdminOnly = asyncHandler(async (req, res, next) => {
  const { id } = req.query;


  if (!id) {
    res.status(400);
    throw new AppError("login first", 401);
  }
  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new AppError("User not found", 401);
  }
  if (user.role !== "admin") {
    res.status(403);
    throw new AppError("You are not authorized to access this route", 403);
  }
  next();
});
