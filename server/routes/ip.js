const express = require("express");
const router = express.Router();
const ipController = require("../controllers/ipController");
const { upload } = require("../config/cloudinary");

// Check if an IP is encrypted (gets status from DB)
router.post("/check-encryption", ipController.checkEncryption);

// Submit encryption request with images
router.post(
  "/request-encryption",
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "receipts", maxCount: 5 },
  ]),
  ipController.requestEncryption
);

// Admin: Update encryption status (approve/reject)
router.post("/update-encryption", ipController.updateEncryptionStatus);

// Delete an encryption image
router.delete("/images/:ip/:imageId/:type", ipController.deleteEncryptionImage);

// Get stats about stored IPs
router.get("/stats", ipController.getStats);

// Get pending encryption requests
router.get("/pending-requests", ipController.getPendingRequests);

module.exports = router;
