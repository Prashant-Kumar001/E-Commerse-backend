import { NODE_ENV } from "../utils/constants.js";


const globalErrorHandler = (err, req, res, next) => {


  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";


  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((el) => el.message).join(", ");
  }


  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered.";
  }


  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your token has expired. Please log in again.";
  }
  if(err.code === "ENOENT"){
    statusCode = 404;
    message = " no such file or directory";
  }

  if(err.name === "CastError") {
    statusCode = 404;
    message = "invalid id";
  }
  if(err.name === "ValidationError") {
    statusCode = 404;
    message = `validation error ${err._message}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: NODE_ENV === "development" ? undefined : undefined
  });
};




const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);



export { globalErrorHandler, asyncHandler };
