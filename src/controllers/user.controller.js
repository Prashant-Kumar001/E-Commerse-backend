import User from "../models/user.model.js";
import AppError from "../utils/appError.js";
import { asyncHandler } from "../middlewares/error.js";
import { message, status } from "../utils/constants.js";

const newUser = asyncHandler(async (req, res) => {


    const { email, id, username, gender, dob, photo } = req.body;

                                            
    
    if (!id, !username || !email || !gender || !dob || !photo) {
        throw new AppError("all fields are required", status.BAD_REQUEST);
    }

    const userExists = await User.findOne({ id, email });

    if (userExists) {
        return res.status(200).json({
            success: true,
            message: `welcome back ${userExists.username}`,
        });
    }


    const user = await User.create({
        _id: id,
        username,
        email,
        gender,
        dob,
        photo
    });

    res.status(201).json({
        success: true,
        message: message.USER_CREATED,
        user
    });
});


const allUsers = asyncHandler(async (req, res) => {
    const users = await User.find();
    res.status(200).json({
        success: true,
        users
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
        user
    })
}
);

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
        message: 'user deleted successfully'
    })
}
);

export { newUser, allUsers, getUser, deleteUser };
