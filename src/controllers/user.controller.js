import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import { asyncHandler } from "../middlewares/error.js";
import { message, status } from "../utils/constants.js";

const newUser = asyncHandler(async (req, res) => {
  const { email, id, username, gender, dob, photo } = req.body;

  const userExists = await User.findById(id);

  if (userExists) {
    return res.status(200).json({
      success: true,
      message: `welcome back ${userExists.username}`,
    });
  } else {
    if ((!id, !username || !email || !gender || !dob || !photo)) {
      throw new AppError("all fields are required", status.BAD_REQUEST);
    }

    const user = await User.create({
      _id: id,
      username,
      email,
      gender,
      dob,
      photo,
    });

    res.status(201).json({
      success: true,
      message: message.USER_CREATED,
      user: user,
    });
  }
});

const allUsers = asyncHandler(async (req, res) => {
  const users = await User.find();



  const transformUserData = users.map((u) => {
    return {
      id: u.id,
      username: u.username,
      age: u.age,
      dob: u.dob,
      gender: u.gender,
      role: u.role,
      status: u.isActive,
      photo: u.photo,
      email: u.email,
    };
  });

  res.status(200).json({
    success: true,
    users: transformUserData,
  });
});

const getUser = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new AppError("user not found", status.BAD_REQUEST);
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError("user not found", status.NOT_FOUND);
  }
  res.status(200).json({
    success: true,
    user,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new AppError("enter user id", status.BAD_REQUEST);
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw new AppError("invalid user id", status.NOT_FOUND);
  }
  res.status(200).json({
    success: true,
    message: "user deleted successfully",
  });
});

export { newUser, allUsers, getUser, deleteUser };
