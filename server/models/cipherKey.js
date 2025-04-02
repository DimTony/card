const mongoose = require("mongoose");

const cipherKeySchema = new mongoose.Schema(
  {
    cipherKey: {
      type: String,
      required: true,
      trim: true,
    },
    ip: {
      type: String,
      required: true,
      trim: true,
    },
    actionType: {
      type: String,
      enum: ["encrypt", "decrypt"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Optional: Add a reference to a User model if you have user authentication
    // userId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User'
    // }
  },
  { versionKey: false, timestamps: true }
);

// Add an index on IP to make queries faster
cipherKeySchema.index({ ip: 1 });

// Add an index on timestamp for efficient chronological queries
cipherKeySchema.index({ timestamp: -1 });

const CipherKey = mongoose.model("CipherKey", cipherKeySchema);

module.exports = CipherKey;
