import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { globalErrorHandler } from './src/middlewares/error.js';
import AppError from "./src/utils/appError.js";
import userRoutes from './src/routes/user.route.js';
import productRoutes from './src/routes/product.route.js';
import orderRoutes from './src/routes/order.route.js';
import paymentRoutes from './src/routes/payment.route.js';
import adminRoutes from './src/routes/admin.route.js';
import { PORT, NODE_ENV, STRIPE_KEY } from "./src/utils/constants.js";
import connectDB from './src/config/db.js';
import Stripe from 'stripe';
import { v2 as cloudinary } from 'cloudinary';
import { connectRedis } from './src/utils/features.js';



connectDB();
export const radis = await connectRedis(process.env.REDIS_URL);


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const stripe = new Stripe(STRIPE_KEY)


const corsOptions = {
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:4173',
    'http://localhost:5174',
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();


app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));



app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the E-commerce API',
  });
});


app.use('/api/v1/user', userRoutes);
app.use('/api/v1/product', productRoutes);
app.use('/api/v1/order', orderRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);



app.use("/src/uploads", express.static("src/uploads"));


app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});


app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
