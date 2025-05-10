import express from 'express';
import nodeCash from 'node-cache';
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



connectDB();

export const stripe = new Stripe(STRIPE_KEY)
export const cache = new nodeCash();

const app = express();


app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
  {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }
));

app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));





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
