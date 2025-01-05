
import { redirect } from "@remix-run/node";
import { accessTokenCookie } from "../createCookie";

export async function loader() {
  const cookieHeader = await accessTokenCookie.serialize("", {
    expires: new Date(0), // Xóa cookie bằng cách đặt thời gian hết hạn
  });

  return redirect('/app/testlogin', {
    headers: {
      "Set-Cookie": cookieHeader,
    },
  });
}

export default function Expires() {
  // useEffect(() => {
  //   location.reload()
  // },[])
}

