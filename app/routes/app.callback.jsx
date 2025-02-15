import axios from "axios";
import { useOutletContext } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import { accessTokenCookie } from "../createCookie";
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticate } from "../shopify.server";
import { createApp } from '@shopify/app-bridge';
import db from "../db.server";

export async function loader({ request }) {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/?error=Authorization code not found");
  }

  const appId = "1711527026305376";
  const appSecret = "09f5603392f88184940c7bc7c03e3a80";
  const redirectUri =
    "https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback";

  try {
    const response = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: code,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token: accessToken } = response.data;
    console.log('accessToken: ', accessToken);
    console.log('response.data: ', response.data);
    const longLivedTokenResponse = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: '09f5603392f88184940c7bc7c03e3a80', // Thay bằng secret của app Instagram
        access_token: accessToken
      }
    });

    const longLivedAccessToken = longLivedTokenResponse.data.access_token;
    console.log('Long-lived Access Token: ', longLivedAccessToken);
    let posts = null
    try {
      const response = await axios.get('https://graph.instagram.com/me', {
        params: {
          fields: 'username',
          access_token: longLivedAccessToken
        }
      });

      posts = response?.data;

    } catch (error) {
      console.error('Lỗi khi lấy bài viết:', error.response?.data || error.message);
      throw error;
    }

    // Bước 2: Lưu accessToken vào metafiels
    const { admin, session } = await authenticate.admin(request);
    const metafield = new admin.rest.resources.Metafield({ session });

    // Gán namespace, key và value cho Metafield
    metafield.namespace = "instagram";
    metafield.key = "access_token";

    metafield.value = JSON.stringify({
      longLivedAccessToken
    });
    metafield.type = "json";

    // Lưu Metafield mới
    await metafield.save({ update: true })

    console.log("Metafield save successfull!", metafield)

    const cookieHeader = await accessTokenCookie.serialize(longLivedAccessToken); //Lưu vào cookie

    //Nếu không tồn tại, tạo mới
    await db.account.create({
      data: {
        sessionId: session.id,
        accessToken: longLivedAccessToken,
        accountName: posts.username
      },
    });

    return json(

      { longLivedAccessToken },
      {
        headers: { "Set-Cookie": cookieHeader },
      }
    );
  } catch (error) {
    console.error(
      "Error fetching Access Token:",
      error.response?.data || error.message
    );
    return json({ accessToken: null });
  }
}

export default function CallBack() {

  const { apiKey, host } = useOutletContext();
  const config = {
    // The client ID provided for your application in the Partner Dashboard.
    apiKey: apiKey,
    // The host of the specific shop that's embedding your app. This value is provided by Shopify as a URL query parameter that's appended to your application URL when your app is loaded inside the Shopify admin.
    host: host,
    forceRedirect: true
  };

  const app = createApp(config);
  const redirect = Redirect.create(app);
  redirect.dispatch(Redirect.Action.ADMIN_PATH, {
    path: `/apps/test-theme-28/app/account`,
    newContext: false,
  });

}
