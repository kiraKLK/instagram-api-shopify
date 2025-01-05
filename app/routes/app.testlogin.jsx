import { Link, AccountConnection, Box, Text } from '@shopify/polaris';
import { useState, useEffect } from 'react';
// import { accessTokenCookie } from "../createCookie";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import db from "../db.server";
import { authenticate } from "../shopify.server";



export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const account = await db.account.findFirst({
        where: { sessionId: session.id },
    })
    const accessToken = account?.accessToken
    // const cookieHeader = request.headers.get("Cookie");
    // const accessToken = await accessTokenCookie.parse(cookieHeader);

    return json({ accessToken })
}

export default function AccountConnectionExample() {
    const { accessToken } = useLoaderData();
    const [connected, setConnected] = useState(false);
    const accountName = connected ? 'Jane Appleseed' : '';
    useEffect(() => {
        if (accessToken) { setConnected(true) }
    }, [accessToken])


    const url = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1711527026305376&redirect_uri=https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish"
    const urlLogout = "/app/expires"
    const buttonText = connected ? 'Disconnect' : 'Connect';
    const details = connected ? 'Account connected' : 'No account connected';
    const terms = connected ? null : (
        <p>
            By clicking <strong>Connect</strong>, you agree to accept Sample App’s{' '}
            <Link url="Example App">terms and conditions</Link>. You’ll pay a
            commission rate of 15% on sales made through Sample App.
        </p>
    );

    return (
        <>
            <Box paddingInline='2000'>
                <Box padding='400'>
                    <Text variant="headingLg" as="h5">
                        Connected account
                    </Text>
                </Box>
                <AccountConnection
                    accountName={accountName}
                    connected={connected}
                    title="Example App"
                    action={{
                        content: buttonText,
                        url: connected ? urlLogout : url,
                        external: 'true',
                        target: connected ? '_self' : '_parent'
                    }}
                    details={details}
                    termsOfService={terms}
                />
            </Box>
        </>
    );
}