import dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// This tells the Cloudinary SDK who you are
// It reads your credentials from the .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
