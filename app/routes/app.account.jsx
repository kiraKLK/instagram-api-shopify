import { useAppBridge } from '@shopify/app-bridge-react';
import { Link, AccountConnection, Box, Text, Page,Button } from '@shopify/polaris';
import {PlusIcon} from '@shopify/polaris-icons';
import { useState, useEffect } from 'react';
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const account = await db.account.findFirst({
        where: { sessionId: session.id },
    });
    return json({ account });
}

export async function action({ request }) {
    const formData = Object.fromEntries(await request.formData());
    const accountId = parseInt(formData?.id?.toString() ?? "1", 10);
    try {
        //Xóa các setting liên quan đến tài khoản
        const accountSettings = await db.widgetSetting.deleteMany({
            where: {
                accountId: accountId
            }
        })
        console.log('accountSettings: ', accountSettings);
        //xóa tài khoản
        const accountDelete = await db.account.delete({
            where: {
                id: accountId,
            },
        });
        console.log('accountDelete: ', accountDelete);
        return json({
            success: true,
            message: `Logout successfully.`,
        });
    } catch (error) {
        console.error("Cannot delete account from database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
}

export default function AccountConnectionExample() {
    const shopify = useAppBridge()
    const fetcher = useFetcher();
    const { account } = useLoaderData();
    const [connected, setConnected] = useState(false);
    const accountName = connected ? account?.accountName : '';

    useEffect(() => {
        shopify.loading(false)
        if (account?.accessToken) {
            setConnected(true);
        }
    }, [account?.accessToken, shopify]);

    useEffect(() => {
        if (fetcher.state === "loading") {
            // Hiển thị toast khi lưu và load dữ liệu thành công
            shopify.toast.show(fetcher.data?.message, {
                duration: 2500,
            })
            shopify.loading(false) // tắt loading
            setConnected(false);
        }
    }, [shopify, fetcher.state, fetcher.data?.message])

    const url = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1711527026305376&redirect_uri=https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish";

    const handleLogout = async (id) => {
        try {
            const formData = new FormData();
            formData.append("id", id);
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true)
        } catch (error) {
            console.error("Error deleting account:", error);
        }
    };

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
            <Page title="All account" primaryAction={<Button icon={PlusIcon} variant="primary" onClick={() => {  }}>Add account</Button>}>
                <Box >
                    <AccountConnection
                        accountName={accountName}
                        connected={connected}
                        title="Instagram App"
                        action={{
                            content: buttonText,
                            onAction: () => connected ? handleLogout(account.id) : window.open(url, "_parent"),
                        }}
                        details={details}
                        termsOfService={terms}
                    />
                </Box>
            </Page>
        </>
    );
}
