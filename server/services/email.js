// services/brevoService.js
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Configure API key authorization
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Create API instance for transactional emails
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Send an email notification for a new encryption request
 * @param {Object} ipInfo - Information about the IP address and device
 * @param {Array} images - Array of uploaded image information
 */
const sendEncryptionRequestNotification = async (ipInfo, images) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.warn("Admin email not configured. Skipping notification.");
      return;
    }

    // Format the IP information for the email
    const locationInfo =
      ipInfo.city && ipInfo.region
        ? `${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country || ""}`
        : "Location information not available";

    // Create HTML for image previews
    const imageHtml = images
      .map(
        (img) =>
          `<div style="margin-bottom: 20px;">
            <p style="font-weight: bold; margin-bottom: 5px;">${
              img.type || "Image"
            }:</p>
            <img src="${img.url}" alt="${
            img.type || "Image"
          }" style="max-width: 300px; max-height: 200px; border: 1px solid #ddd;">
          </div>`
      )
      .join("");

    // Create email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2a4365;">New Encryption Request Received</h2>
        <p>A new encryption request has been submitted and requires your review.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748;">IP Information</h3>
          <p><strong>IP Address:</strong> ${ipInfo.ip}</p>
          <p><strong>Location:</strong> ${locationInfo}</p>
          <p><strong>ISP:</strong> ${ipInfo.isp || "Not available"}</p>
          <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748;">Device Information</h3>
          <p><strong>Device Model:</strong> ${
            ipInfo.deviceModel || "Not provided"
          }</p>
          <p><strong>OS Version:</strong> ${
            ipInfo.osVersion || "Not provided"
          }</p>
          <p><strong>Email:</strong> ${ipInfo.email || "Not provided"}</p>
          <p><strong>Phone Number:</strong> ${
            ipInfo.phoneNumber || "Not provided"
          }</p>
        </div>
        
        <h3 style="color: #2d3748;">Uploaded Images (${images.length})</h3>
        ${imageHtml}
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea;">
          <p>Please review this request in the admin dashboard.</p>
        </div>
      </div>
    `;

    // Create a send email object
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = `New Encryption Request: ${ipInfo.ip}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: "Encryption System",
      email: process.env.SENDER_EMAIL,
    };
    sendSmtpEmail.to = [{ email: adminEmail }];

    // Send the email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Email notification sent:", data);
    return data;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    // Don't throw the error to prevent affecting the main flow
  }
};

module.exports = {
  sendEncryptionRequestNotification,
};
