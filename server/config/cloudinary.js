require("dotenv").config()
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up CloudinaryStorage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "encryption-cards",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    // transformation: [{ width: 1000, height: 1000, crop: "limit" }],
  },
});

// Create multer upload middleware
const upload = multer({ storage: storage });

module.exports = {
  cloudinary,
  upload,
};
