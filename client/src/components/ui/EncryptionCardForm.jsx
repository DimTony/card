import React, { useState } from "react";
import { Box, Text, VStack, HStack } from "@chakra-ui/react";
import { FiUpload, FiX, FiSend, FiCheckCircle } from "react-icons/fi";
import axios from "axios";

const EncryptionCardForm = ({ ipInfo }) => {
  const [formData, setFormData] = useState({
    deviceModel: "",
    osVersion: "",
    email: "",
    phoneNumber: "",
  });

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [receiptPreviews, setReceiptPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle encryption card image selection
  const handleCardImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    // Create previews
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  // Handle receipt image selection
  const handleReceiptImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setReceiptFiles(selectedFiles);

    // Create previews
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setReceiptPreviews(newPreviews);
  };

  // Clear card images
  const clearCardImages = () => {
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setFiles([]);
  };

  // Clear receipt images
  const clearReceiptImages = () => {
    setReceiptPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setReceiptFiles([]);
  };

  // Show error message
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(""), 5000);
  };

  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.deviceModel ||
      !formData.osVersion ||
      !formData.email ||
      !formData.phoneNumber
    ) {
      showError("Please fill in all required fields");
      return;
    }

    if (files.length === 0) {
      showError("Please upload images of your encryption cards");
      return;
    }

    setIsSubmitting(true);

    // Create FormData
    const formDataToSend = new FormData();
    formDataToSend.append("ip", ipInfo.ip);
    formDataToSend.append("deviceModel", formData.deviceModel);
    formDataToSend.append("osVersion", formData.osVersion);
    formDataToSend.append("email", formData.email);
    formDataToSend.append("phoneNumber", formData.phoneNumber);

    // Append all encryption card images
    files.forEach((file) => {
      formDataToSend.append("images", file);
    });

    // Append all receipt images
    receiptFiles.forEach((file) => {
      formDataToSend.append("receipts", file);
    });

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/request-encryption`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Clear form and set as submitted
      setFormData({
        deviceModel: "",
        osVersion: "",
        email: "",
        phoneNumber: "",
      });
      clearCardImages();
      clearReceiptImages();
      setSubmitted(true);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "An error occurred while submitting your request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Box mt={6} p={5} bg="#f0fff4" borderRadius="md" w="100%">
        <VStack spacing={4} align="center">
          <FiCheckCircle size={60} color="green" />
          <Text fontWeight="bold" fontSize="xl" textAlign="center">
            Request Submitted!
          </Text>
          <Text textAlign="center">
            Thank you for submitting your encryption request. Our team will
            review it soon and update your encryption status.
          </Text>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              border: "1px solid #38a169",
              color: "#38a169",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              background: "transparent",
            }}
          >
            Submit Another Request
          </button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box mt={6} w="100%">
      {error && (
        <Box p={3} bg="#FED7D7" color="#C53030" mb={4} borderRadius="md">
          <Text>{error}</Text>
        </Box>
      )}
      <form onSubmit={handleSubmit}>
        <VStack spacing={5} align="start">
          <Text fontWeight="bold" fontSize="xl">
            Request Encryption Verification
          </Text>
          <Text>
            To verify your encryption status, please provide the following
            information and upload clear images of your encryption cards and
            receipts.
          </Text>

          <hr
            style={{
              width: "100%",
              margin: "10px 0",
              border: "none",
              borderTop: "1px solid #E2E8F0",
            }}
          />

          <Text fontWeight="bold" w="100%">
            Device Information
          </Text>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "500",
                }}
              >
                Device Model*
              </label>
              <input
                type="text"
                name="deviceModel"
                value={formData.deviceModel}
                onChange={handleChange}
                placeholder="e.g. iPhone 13, Samsung S21"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #CBD5E0",
                  borderRadius: "4px",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "500",
                }}
              >
                OS Version*
              </label>
              <input
                type="text"
                name="osVersion"
                value={formData.osVersion}
                onChange={handleChange}
                placeholder="e.g. iOS 15.2, Android 12"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #CBD5E0",
                  borderRadius: "4px",
                }}
                required
              />
            </div>
          </div>

          <Text fontWeight="bold" w="100%">
            Contact Information
          </Text>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%",
            }}
          >
            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "500",
                }}
              >
                Email Address*
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #CBD5E0",
                  borderRadius: "4px",
                }}
                required
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontWeight: "500",
                }}
              >
                Phone Number*
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #CBD5E0",
                  borderRadius: "4px",
                }}
                required
              />
            </div>
          </div>

          <hr
            style={{
              width: "100%",
              margin: "10px 0",
              border: "none",
              borderTop: "1px solid #E2E8F0",
            }}
          />

          <Text fontWeight="bold" w="100%">
            Encryption Card Images <span style={{ color: "red" }}>*</span>
          </Text>
          <Text fontSize="sm" color="gray.600">
            Please upload clear images showing the encryption code and amount on
            each card.
          </Text>

          <div style={{ width: "100%", marginBottom: "8px" }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleCardImageChange}
              id="card-upload"
              style={{ display: "none" }}
              disabled={isSubmitting}
            />
            <label
              htmlFor="card-upload"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 16px",
                backgroundColor: "#EBF8FF",
                color: "#3182CE",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%",
                border: "1px solid #3182CE",
              }}
            >
              <FiUpload style={{ marginRight: "8px" }} />
              Upload Encryption Card Images
            </label>
          </div>

          {previews.length > 0 && (
            <Box w="100%">
              <HStack justifyContent="space-between" mb={2}>
                <Text fontWeight="medium">Card Images ({previews.length})</Text>
                <button
                  type="button"
                  onClick={clearCardImages}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#718096",
                    fontSize: "14px",
                  }}
                >
                  <FiX style={{ marginRight: "4px" }} />
                  Clear
                </button>
              </HStack>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {previews.map((src, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt={`Preview ${index + 1}`}
                      style={{
                        objectFit: "cover",
                        width: "100px",
                        height: "100px",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                ))}
              </div>
            </Box>
          )}

          <Text fontWeight="bold" w="100%">
            Receipt Images <span style={{ color: "red" }}>*</span>
          </Text>
          <Text fontSize="sm" color="gray.600">
            Upload images of receipts for the encryption cards.
          </Text>

          <div style={{ width: "100%", marginBottom: "8px" }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleReceiptImageChange}
              id="receipt-upload"
              style={{ display: "none" }}
              disabled={isSubmitting}
            />
            <label
              htmlFor="receipt-upload"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 16px",
                backgroundColor: "#F7FAFC",
                color: "#4A5568",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%",
                border: "1px solid #CBD5E0",
              }}
            >
              <FiUpload style={{ marginRight: "8px" }} />
              Upload Receipt Images
            </label>
          </div>

          {receiptPreviews.length > 0 && (
            <Box w="100%">
              <HStack justifyContent="space-between" mb={2}>
                <Text fontWeight="medium">
                  Receipt Images ({receiptPreviews.length})
                </Text>
                <button
                  type="button"
                  onClick={clearReceiptImages}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#718096",
                    fontSize: "14px",
                  }}
                >
                  <FiX style={{ marginRight: "4px" }} />
                  Clear
                </button>
              </HStack>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {receiptPreviews.map((src, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt={`Receipt ${index + 1}`}
                      style={{
                        objectFit: "cover",
                        width: "100px",
                        height: "100px",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                ))}
              </div>
            </Box>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 16px",
              backgroundColor: "#38A169",
              color: "white",
              borderRadius: "4px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              width: "100%",
              marginTop: "16px",
              border: "none",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    border: "3px solid #ffffff33",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    marginRight: "8px",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Submitting...
              </>
            ) : (
              <>
                <FiSend style={{ marginRight: "8px" }} />
                Submit Encryption Request
              </>
            )}
          </button>
          <style jsx="true">{`
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </VStack>
      </form>
    </Box>
  );
};

export default EncryptionCardForm;
