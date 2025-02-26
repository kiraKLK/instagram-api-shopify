import { createApp } from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge/utilities";
import { useOutletContext } from "@remix-run/react";
import { useEffect } from "react";
import axios from "axios";

// Hàm trao đổi session token lấy access token
async function exchangeAccessToken(shop, sessionToken, clientId, clientSecret) {
  const url = `https://${shop}.myshopify.com/admin/oauth/access_token`;

  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: sessionToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    requested_token_type: "urn:shopify:params:oauth:token-type:online-access-token",
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Trả về access token từ response
    return response.data.access_token;
  } catch (error) {
    console.error("Error exchanging session token for access token:", error.response?.data || error.message);
    throw error;
  }
}

export default function CallBack() {
  const { apiKey, host } = useOutletContext();

  const app = createApp({
    apiKey: apiKey,
    host: host,
    forceRedirect: true,
  });

  useEffect(() => {
    const fetchSessionToken = async () => {
      try {
        // Lấy session token từ Shopify App Bridge
        const sessionToken = await getSessionToken(app);
        console.log("Session Token:", sessionToken);

        // Cấu hình thông tin shop và app
        const shop = "test-qr-app"; // Thay bằng tên shop của bạn
        const clientId = "de4349f3cb6d7c794a2536266a976f22"; // Thay bằng client ID
        const clientSecret = "b626a007587ded32d140a796d8e68b14"; // Thay bằng client secret

        // Gọi API để lấy access token
        const accessToken = await exchangeAccessToken(shop, sessionToken, clientId, clientSecret);
        console.log("Access Token:", accessToken);
      } catch (error) {
        console.error("Failed to retrieve session token or access token:", error);
      }
    };

    fetchSessionToken(); // Gọi hàm async bên trong useEffect
  }, [app]); // Thêm app vào dependency để tránh lỗi

  return (
    <div>
      <h1>Hello</h1>
    </div>
  );
}
