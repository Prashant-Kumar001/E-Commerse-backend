import mongoose from 'mongoose';
import { DB_URL } from '../utils/constants.js';
const connectDB = async () => { 
    try {
        await mongoose.connect(DB_URL, {
            dbName: "Ecommerce",
            authSource: 'admin'
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        console.log('Error connecting to MongoDB');
        console.error(err.message);
        process.exit(1);
    }
};

export default connectDB;
