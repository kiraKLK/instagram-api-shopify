import { json } from "@remix-run/node";

const VERIFY_TOKEN = "meatyhamhock"; // Token mà bạn đã cấu hình trong App Dashboard.

export async function loader({ request }) {
  const url = new URL(request.url);

  // Lấy các tham số từ query string
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  // Kiểm tra `hub.mode` và `hub.verify_token`
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully.");
    return new Response(challenge, { status: 200 });
  } else {
    console.error("Webhook verification failed.");
    return new Response("Forbidden", { status: 403 });
  }
}

export async function action({ request }) {
  const payload = await request.json();

  // Xử lý thông báo sự kiện từ Facebook
  console.log("Received webhook event:", payload);

  // Trả về 200 để xác nhận đã nhận thông báo
  return json({ status: "success" });
}
