import { config } from 'dotenv';
config({
    path: './.env',
  });

export const PORT = process.env.PORT || 3000;
export const DB_URL = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRE = process.env.JWT_EXPIRE;
export const NODE_ENV = process.env.NODE_ENV;
export const STRIPE_KEY = process.env.STRIPE_KEY;
export const SALT_ROUNDS = 10;
export const REDIS_TTL = process.env.REDIS_TTL

export const message = {
    USER_CREATED: "User created successfully",
    USER_EXISTS: "User already exists",
    INVALID_CREDENTIALS: "Invalid email or password",
};

export const status = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    SERVER_ERROR: 500,
};
