import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";

// Xử lý OPTIONS để hỗ trợ CORS
export const loader = async ({ request }) => {
    try {
        return json(
            { success: true },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*", // Cho phép tất cả các domain
                    "Access-Control-Allow-Methods": "POST, OPTIONS, GET", // Các phương thức được phép
                    "Access-Control-Allow-Headers": "Content-Type", // Các headers được phép
                },
            },
        );
    } catch (error) {
        console.error("Error fetching cookie data:", error);
        return json({ error: "Failed to fetch data" }, { status: 500 });
    }
};

// Action để xử lý dữ liệu gửi lên
export const action = async ({ request }) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*", // Cho phép tất cả các domain
                "Access-Control-Allow-Methods": "POST, OPTIONS", // Các phương thức được phép
                "Access-Control-Allow-Headers": "Content-Type", // Các headers được phép
            },
        });
    }

    try {
        // Lấy dữ liệu từ request body
        const data = await request.json();
        console.log("Receiving data:", data);

        // Sử dụng admin API để lưu Metafield
        const { admin, session } = await unauthenticated.admin(data.domain);

        const metafield = new admin.rest.resources.Metafield({ session });

        // Thiết lập namespace, key và giá trị cho Metafield
        metafield.namespace = "instagram";
        metafield.key = "current_setting";
        metafield.value = JSON.stringify(data);
        metafield.type = "json";

        // Lưu Metafield
        await metafield.save({ update: true });

        console.log("Metafield saved successfully!", metafield);

        // Trả về phản hồi thành công
        return json(
            { success: true, metafield },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*", // Cho phép tất cả các domain
                    "Access-Control-Allow-Methods": "POST, OPTIONS", // Các phương thức được phép
                    "Access-Control-Allow-Headers": "Content-Type", // Các headers được phép
                },
            },
        );
    } catch (error) {
        console.error("Error processing request:", error.stack || error);
        return json(
            { error: error.message || "An error occurred" },
            {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                },
            },
        );
    }
};
