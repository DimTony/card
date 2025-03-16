import React, { useEffect, useState } from "react";
import MobileWarning from "../components/ui/MobileWarning";
import { Box, Text, VStack, HStack } from "@chakra-ui/react";
import { toaster } from "../components/ui/toaster";
import axios from "axios";
import EncryptionCardForm from "../components/ui/EncryptionCardForm";

const Landing = () => {
  const [ipInfo, setIpInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState("pending");
  const [showForm, setShowForm] = useState(false);

  // Fetch IP information before the app fully renders its main content
  useEffect(() => {
    const fetchIpInfo = async () => {
      try {
        // First API call: Get IP address
        const ipResponse = await axios.get("https://api.ipify.org?format=json");
        const ipData = ipResponse.data;
        setIpInfo(ipData);

        // Second API call: Use ipwho.is for geolocation (CORS-friendly)
        if (ipData.ip) {
          try {
            const geoResponse = await axios.get(
              `https://ipwho.is/${ipData.ip}`
            );
            const geoData = geoResponse.data;

            if (geoData.success !== false) {
              setIpInfo((prevState) => ({
                ...prevState,
                city: geoData.city,
                region: geoData.region,
                country_name: geoData.country,
                country_code: geoData.country_code,
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                timezone: geoData.timezone,
                connection: geoData.connection,
              }));
            } else {
              console.warn("Geolocation data not available:", geoData.message);
            }
          } catch (geoError) {
            console.warn("Error fetching location data:", geoError);
            // Continue without location data
          }

          // Third API call: Check with your backend if the IP is encrypted
          try {
            // Replace with your actual backend endpoint
            const encryptionResponse = await axios.post(
              `${import.meta.env.VITE_API_URL}/api/check-encryption`,
              {
                ip: ipData.ip,
              }
            );

            setIsEncrypted(encryptionResponse.data.encrypted);
            if (encryptionResponse.data.encryptionStatus) {
              setEncryptionStatus(encryptionResponse.data.encryptionStatus);
            }
          } catch (encryptionError) {
            console.error("Error checking encryption status:", encryptionError);
            setIsEncrypted(false);
            toaster.create({
              title: "Encryption Check Failed",
              description: "Could not verify if your connection is encrypted",
              type: "warning",
            });
          }
        }
      } catch (err) {
        console.error("Error fetching IP information:", err);
        toaster.create({
          title: "Error fetching data",
          description: err.response?.data?.message || err.message,
          type: "error",
        });
      } finally {
        setLoading(false);
        setAppReady(true);
      }
    };

    fetchIpInfo();
  }, []);

  // Toggle the form visibility
  const toggleForm = () => {
    setShowForm(!showForm);
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid rgba(0, 0, 0, 0.1)",
            borderTopColor: "#3182CE",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
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
      </div>
    );
  }

  return (
    <>
      {appReady && (
        <>
          <VStack
            className="app"
            alignItems="flex-start"
            w="100dvw"
            h="100dvh"
            padding={4}
            overflowY="auto"
            spacing={4}
          >
            <HStack w="100%">
              <a href="/">
                <img src="/logoFull.svg" alt="logo" style={{ width: "5rem" }} />
              </a>
            </HStack>
            <VStack alignItems="flex-start" w="100%" spacing={4}>
              <HStack>
                <Text>Device Status:</Text>
                <HStack>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "2px 10px",
                      borderRadius: "9999px",
                      backgroundColor: isEncrypted ? "#C6F6D5" : "#FED7D7",
                      color: isEncrypted ? "#22543D" : "#822727",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: isEncrypted ? "#38A169" : "#E53E3E",
                        marginRight: "6px",
                      }}
                    />
                    {isEncrypted ? "Encrypted" : "Unencrypted"}
                  </div>
                </HStack>
              </HStack>
              {ipInfo && (
                <Box
                  mt={4}
                  p={3}
                  bg="blackAlpha.700"
                  color="white"
                  borderRadius="md"
                  w="100%"
                >
                  <Text fontSize="sm">IP: {ipInfo.ip}</Text>
                  {ipInfo.city && (
                    <>
                      <Text fontSize="sm">
                        Location: {ipInfo.city}, {ipInfo.region},{" "}
                        {ipInfo.country_name}
                      </Text>
                      {ipInfo.connection && (
                        <Text fontSize="sm">ISP: {ipInfo.connection.isp}</Text>
                      )}
                    </>
                  )}
                </Box>
              )}

              {!isEncrypted && (
                <VStack w="100%" alignItems="flex-start" spacing={4} mt={4}>
                  <hr
                    style={{
                      width: "100%",
                      margin: "10px 0",
                      border: "none",
                      borderTop: "1px solid rgba(0,0,0,0.1)",
                    }}
                  />

                  {encryptionStatus === "pending" && (
                    <div
                      style={{
                        backgroundColor: "#FFFBEA",
                        padding: "16px",
                        borderRadius: "6px",
                        width: "100%",
                      }}
                    >
                      <Text fontWeight="bold" color="#B7791F">
                        Pending Verification
                      </Text>
                      <Text fontSize="sm" color="#4A5568">
                        Your encryption request is being reviewed. You'll be
                        notified once it's processed.
                      </Text>
                    </div>
                  )}

                  {encryptionStatus === "rejected" && (
                    <div
                      style={{
                        backgroundColor: "#FFF5F5",
                        padding: "16px",
                        borderRadius: "6px",
                        width: "100%",
                      }}
                    >
                      <Text fontWeight="bold" color="#C53030">
                        Verification Rejected
                      </Text>
                      <Text fontSize="sm" color="#4A5568">
                        Your previous encryption request was rejected. Please
                        submit a new request with clearer images.
                      </Text>
                    </div>
                  )}

                  <button
                    onClick={toggleForm}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      backgroundColor: !showForm ? "#3182CE" : "transparent",
                      color: !showForm ? "white" : "#3182CE",
                      border: !showForm ? "none" : "1px solid #3182CE",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {!showForm
                      ? encryptionStatus === "pending"
                        ? "Submit New Verification"
                        : "Submit Encryption Verification"
                      : "Hide Form"}
                  </button>

                  {showForm && <EncryptionCardForm ipInfo={ipInfo} />}
                </VStack>
              )}
            </VStack>
          </VStack>
          <MobileWarning />
        </>
      )}
    </>
  );
};

export default Landing;
