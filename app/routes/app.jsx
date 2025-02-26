import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useNavigate } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu, useAppBridge } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { cssBundleHref } from "@remix-run/css-bundle";
import { useEffect } from "react";

export const links = () => [
  ...(cssBundleHref
    ? [{ rel: "stylesheet", href: cssBundleHref }]
    : []),
  { rel: "stylesheet", href: polarisStyles }
];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const host = url.searchParams.get("host");

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    host,
  });
};

export default function App() {
  const { apiKey, host } = useLoaderData();
  const shopify = useAppBridge();
  const navigate = useNavigate(); // Sử dụng hook useNavigate từ Remix

  const handleClick = (event, to) => {
    event.preventDefault(); // Ngăn chặn hành vi mặc định
    shopify.loading(true); // Bắt đầu quá trình loading
    navigate(to); // Sử dụng điều hướng client-side của Remix
  };

  // UseEffect để theo dõi thay đổi của route và tắt loading khi trang đã thay đổi
  useEffect(() => {
    // Khi Outlet hiển thị, tức là trang đã tải xong => tắt loading
    shopify.loading(false);
  }, [shopify]);

  return (
    <AppProvider
      isEmbeddedApp
      apiKey={apiKey}
      host={host} // Truyền host vào AppProvider
    >
      <NavMenu>
        <Link to="/app" rel="home" onClick={(event) => handleClick(event, "/app")}>
          Home
        </Link>
        <Link to="/app/account" onClick={(event) => handleClick(event, "/app/account")}>Account</Link>
        <Link to="/app/test-deffered">test-deffered</Link>
        <Link to="/app/source" onClick={(event) => handleClick(event, "/app/source")}>Media source</Link>
        <Link to="/app/widget" onClick={(event) => handleClick(event, "/app/widget")}>Widget</Link>
      </NavMenu>
      <Outlet context={{ apiKey, host }} />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
