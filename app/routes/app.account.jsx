import { Link, AccountConnection,Button } from "@shopify/polaris";
import { useState, useCallback, useEffect, useRef } from "react";
import { accessTokenCookie } from "../createCookie";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useOutletContext } from "@remix-run/react";
import { createApp } from '@shopify/app-bridge';
import { Redirect } from '@shopify/app-bridge/actions';
import db from "../db.server";

export async function loader({ request }) {
  const cookieHeader = request.headers.get("Cookie");
  const accessToken = await accessTokenCookie.parse(cookieHeader);
  
  return json({ accessToken });
}

export async function action({ request }) {
  return null;
}

export default function Account() {
  const { accessToken } = useLoaderData();
  const { apiKey, host } = useOutletContext();
  console.log('host: ', host);
  console.log('apiKey: ', apiKey);

  const config = {
    // The client ID provided for your application in the Partner Dashboard.
    apiKey: apiKey,
    // The host of the specific shop that's embedding your app. This value is provided by Shopify as a URL query parameter that's appended to your application URL when your app is loaded inside the Shopify admin.
    host: 'YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvdGVzdC1xci1hcHA',
    forceRedirect: true
  };

  const app = createApp(config);
  const redirect = Redirect.create(app);


  const popupWidth = 600;
  const popupHeight = 600;


  const [connected, setConnected] = useState(!!accessToken);

  const popupRef = useRef(null);

  useEffect(() => {
    setConnected(!!accessToken);
  }, [accessToken]);

  const handleAction = useCallback(() => {
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;
    const left = (screenWidth - popupWidth) / 2;
    const top = (screenHeight - popupHeight) / 2;

    if (!connected) {
      const authUrl =
        "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1711527026305376&redirect_uri=https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish";

      //Go to http://example.com in a new window
      const test = redirect.dispatch(Redirect.Action.REMOTE, {
        url: authUrl,
        newContext: false,
      });
      console.log('test: ', test);

      // popupRef.current = window.open(
      //   authUrl,
      //   "InstagramLogin",
      //   `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
      // )
      // //popupRef.current.postMessage("hello there!", "https://planner-jelsoft-solution-ease.trycloudflare.com")
      // window.addEventListener(
      //   "message",
      //   (event) => {
      //     // Do we trust the sender of this message? (might be
      //     // different from what we originally opened, for example).
      //     //if (event.origin !== "https://planner-jelsoft-solution-ease.trycloudflare.com") return;

      //     // event.source is popup
      //     //if (event.data) location.reload()

      //     console.log('event.data : ', event.data)
      //   },
      //   false,
      // );
    }
  }, [connected]);

  const buttonText = connected ?
    <Form action="/app/expires" method="post">
      Logout
      {/* <Button submit>
        Logout
      </Button> */}
    </Form> : "Connect";
  const details = connected ? "Account connected" : "No account connected";
  const terms = connected ? null : (
    <p>
      By clicking <strong>Connect</strong>, you agree to accept InsApp{" "}
      <Link url="InsApp">terms and conditions</Link>.
    </p>
  );

  return (
    <>
      <AccountConnection
        connected={connected}
        title="Instagram App"
        action={{
          content: buttonText,
          onAction: handleAction,
        }}
        details={details}
        termsOfService={terms}
      />
    </>
  );
}
