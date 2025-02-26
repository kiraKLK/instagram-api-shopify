import { createCookie } from "@remix-run/node";

export const accessTokenCookie = createCookie("accessToken", {
    maxAge: 60 * 60 * 24, // 1 ngày
    httpOnly: true, // Không thể truy cập từ JavaScript
    secure: true, // Chỉ sử dụng qua HTTPS
    sameSite: "none", // Bảo vệ CSRF
  });
  