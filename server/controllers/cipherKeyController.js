const CipherKey = require("../models/cipherKey");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

/**
 * Store a new cipher key with atomic operation guarantees
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.storeCipherKey = async (req, res) => {
  // Start a MongoDB session for transaction support
  const session = await mongoose.startSession();

  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cipherKey, ip, actionType, timestamp } = req.body;

    // Begin transaction
    session.startTransaction();

    // Create a new cipher key record
    const newCipherKey = new CipherKey({
      cipherKey,
      ip,
      actionType,
      timestamp: timestamp || new Date(),
    });

    // Save to database within the transaction
    await newCipherKey.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Cipher key stored successfully",
      data: {
        id: newCipherKey._id,
        timestamp: newCipherKey.timestamp,
      },
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();

    console.error("Error storing cipher key:", error);

    // Return error response
    return res.status(500).json({
      success: false,
      message: "Failed to store cipher key",
      error:
        process.env.NODE_ENV === "production" ? "Server error" : error.message,
    });
  } finally {
    // End session
    session.endSession();
  }
};

/**
 * Get cipher keys for a specific IP with optimistic concurrency control
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCipherKeysByIp = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { ip } = req.params;

    // Find all cipher keys for the specified IP with snapshot isolation
    // Using lean() for better performance when we only need to read data
    const cipherKeys = await CipherKey.find({ ip })
      .session(session)
      .sort({ timestamp: -1 })
      .select("-__v")
      .lean(); // Convert MongoDB documents to plain JavaScript objects

    // Record the read operation for analytics (optional)
    await logApiAccess("getCipherKeysByIp", ip, session);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      count: cipherKeys.length,
      data: cipherKeys,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Error retrieving cipher keys:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cipher keys",
      error:
        process.env.NODE_ENV === "production" ? "Server error" : error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get analytics on cipher key usage with consistent reads
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCipherKeyAnalytics = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Get count of encryption vs decryption actions
    const actionCounts = await CipherKey.aggregate([
      {
        $group: {
          _id: "$actionType",
          count: { $sum: 1 },
        },
      },
    ]).session(session);

    // Get hourly activity for the last 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyActivity = await CipherKey.aggregate([
      {
        $match: {
          timestamp: { $gte: oneDayAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            hour: { $hour: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
          "_id.hour": 1,
        },
      },
    ]).session(session);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: {
        actionCounts,
        hourlyActivity,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Error retrieving cipher key analytics:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cipher key analytics",
      error:
        process.env.NODE_ENV === "production" ? "Server error" : error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Delete cipher keys older than a specified date with atomic guarantees
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteCipherKeys = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { days = 30 } = req.body; // Default to 30 days

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get count before deletion for reporting
    const countBefore = await CipherKey.countDocuments({
      timestamp: { $lt: cutoffDate },
    }).session(session);

    // Perform deletion within transaction
    const result = await CipherKey.deleteMany({
      timestamp: { $lt: cutoffDate },
    }).session(session);

    // Verify deletion count matches expected count for atomicity
    if (result.deletedCount !== countBefore) {
      throw new Error(
        "Deletion count mismatch - possible concurrent modification"
      );
    }

    // Additional verification query to ensure all matching documents were deleted
    const remainingCount = await CipherKey.countDocuments({
      timestamp: { $lt: cutoffDate },
    }).session(session);

    if (remainingCount !== 0) {
      throw new Error("Deletion verification failed - records still exist");
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} cipher keys older than ${days} days`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Error deleting cipher keys:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete cipher keys",
      error:
        process.env.NODE_ENV === "production" ? "Server error" : error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Helper function to log API access (used by other controller methods)
 * @param {string} operation - The operation being performed
 * @param {string} ip - IP address associated with the operation
 * @param {mongoose.ClientSession} session - MongoDB session
 */
async function logApiAccess(operation, ip, session) {
  // This could be expanded to a full logging system
  // For now, just a placeholder that works within the transaction
  console.log(
    `API Access: ${operation} for IP ${ip} at ${new Date().toISOString()}`
  );

  // Optional: Create an actual log entry in another collection
  // const ApiLog = mongoose.model('ApiLog');
  // await new ApiLog({
  //   operation,
  //   ip,
  //   timestamp: new Date()
  // }).save({ session });
}
