import { useAppBridge, Modal, TitleBar, } from '@shopify/app-bridge-react';
import { Link, AccountConnection, Box, Text, Page, Button, Icon, InlineStack, BlockStack,Spinner } from '@shopify/polaris';
import { PlusIcon, DeleteIcon, DatabaseIcon, ImageIcon } from '@shopify/polaris-icons';
import { useState, useEffect } from 'react';
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import styles from '../style/style-widget.css?url'
export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const account = await db.account.findMany({
        where: { sessionId: session.id },
    });
    return json({ account });
}

export async function action({ request }) {
    const formData = Object.fromEntries(await request.formData());
    const accountId = parseInt(formData?.id?.toString() ?? "1", 10);
    try {
        const account = await db.account.findMany({
            where: {
                id: accountId
            }
        })

        const sources = await db.source.findMany({
            where: {
                accountId: accountId
            }
        });

        const gallerys = await db.gallery.findMany({
            where: {
                sourceId: {
                    in: sources.map(source => source.id)
                }
            }
        });

        const widgets = await db.widgetSetting.findMany({
            where: {
                galleryId: {
                    in: gallerys.map(gallery => gallery.id)
                }
            }
        });


        if (sources.length > 0) {
            const accountObject = await Promise.all(account.map(async (acc) => {
                const sourcesInLoop = await Promise.all(sources.filter(source => source.accountId === acc.id).map(async (source) => {
                    const galleries = await Promise.all(gallerys.filter(gallery => gallery.sourceId === source.id).map(async (gallery) => {
                        const widgetSettings = await db.widgetSetting.findMany({
                            where: { galleryId: gallery.id },
                        });
                        return { ...gallery, widgetSettings };
                    }));
                    return { ...source, galleries };
                }))
                return { ...acc, sourcesInLoop }
            }))
            console.log("🚀 ~ accountObject ~ accountObject:", accountObject)
            return json({
                success: false,
                message: `Delete account failed.`,
                account: accountObject,
            });
        } else {
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
        }
    } catch (error) {
        console.error("Cannot delete account from database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
}

export default function AccountConnectionExample() {
    const shopify = useAppBridge()
    const fetcher = useFetcher();
    const { account } = useLoaderData();
    console.log("🚀 ~ AccountConnectionExample ~ account:", account)
    const [connected, setConnected] = useState(false);
    const [reload, setReload] = useState(false)
    const [accountObject, setAccountObject] = useState(fetcher.data?.account)
    const [currentIdAccount, setCurrentIdAccount] = useState()


    useEffect(() => {
        shopify.loading(false)
        if (account.length > 0) {
            setConnected(true);
        }
    }, [account, shopify]);

    useEffect(() => {
        if (fetcher.state === "loading") {

            switch (fetcher.data?.message) {
                case "Logout successfully.":
                    shopify.toast.show(fetcher.data?.message, { duration: 2500 });
                    shopify.modal.hide('modal-confirm-delete');
                    shopify.modal.hide('modal-confirm-delete-sub');
                    break;
                case "Delete account failed.":
                    shopify.modal.hide('modal-confirm-delete');
                    shopify.modal.show('modal-confirm-delete-sub');
                    break;
                default:
                    break;
            }
            console.log("data:", fetcher.data.account);

            shopify.loading(false) // tắt loading
            setConnected(false);
        }
    }, [shopify, fetcher.state, fetcher.data?.message])

    useEffect(() => {
        if (fetcher.data?.account) {
            setAccountObject(fetcher.data?.account);
        }
    }, [fetcher.data, accountObject]);

    const url = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1711527026305376&redirect_uri=https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish";

    const handleLogout = async (id) => {
        setCurrentIdAccount(id)
        try {
            const formData = new FormData();
            formData.append("id", id);
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true)
        } catch (error) {
            console.error("Error deleting account:", error);
        }
    };

    const handleDeleteById = async (type, id) => {
        try {
            const formData = new FormData();
            formData.append("_action", "delete");
            formData.append("type", type);
            formData.append("idToDelete", id);
            setReload(true);
            shopify.loading(true);
            const response = await fetch("/app/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams(formData).toString(),
            });
            const result = await response.json();

            if (!response.ok) {
                shopify.toast.show(result.message, { duration: 2500 });
                shopify.loading(false);
                setReload(false);
                return;
            } else {
                handleLogout(currentIdAccount)
                shopify.toast.show(result.message, { duration: 2500 });
                shopify.loading(false);
                setReload(false);
                return result;
            }
        } catch (error) {
            console.error("Error deleting :", error);
        }
    }

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
            <Page title="All account" primaryAction={<Button icon={PlusIcon} variant="primary" onClick={() => {window.open(url, "_parent") }}>Add account</Button>}>
                {account?.length > 0 ? (
                    account.map((acc, index) => (
                        <Box padding="400" key={index}>
                            <AccountConnection
                                accountName={acc.accountName}
                                connected={connected}
                                title="Instagram App"
                                action={{
                                    content: buttonText,
                                    onAction: () => connected ? handleLogout(acc.id) : window.open(url, "_parent"),
                                }}
                                details={details}
                                termsOfService={terms}
                            />
                        </Box>
                    ))
                ) : (
                    <Box padding="400">
                        <AccountConnection
                            accountName="No Account"
                            connected={false}
                            title="Instagram App"
                            action={{
                                content: buttonText,
                                onAction: () => window.open(url, "_parent"),
                            }}
                            details={details}
                            termsOfService={terms}
                        />
                    </Box>
                )}
            </Page>

            <Modal id="modal-confirm-delete">
                <Box padding='400'>
                    <p>This can't be undone.</p>
                </Box>
                <TitleBar title="Delete selected widget(s)?">
                    <button loading={(fetcher.state === "submitting") ? ("true") : undefined} onClick={() => { }} tone="critical" variant="primary">Confirm</button>
                    <button disabled={false} onClick={() => { shopify.modal.hide('modal-confirm-delete') }}>Cancel</button>
                </TitleBar>
            </Modal>

            <Modal id="modal-confirm-delete-sub">
                {reload ? (<InlineStack blockAlign='center' align='center'><Spinner accessibilityLabel="Spinner example" size="large" /></InlineStack>) : (
                    <Box padding='400'>
                        <div className="modal-required-delete-source">
                            <p className='modal-required-delete-source-title' style={{ marginBottom: '16px' }}>Remove the items listed below before deleting the media source(s) to ensure your data is accurate, consistent, and complete.</p>
                            <div className="modal-required-delete-source-list-tree">
                                {accountObject?.map((acc, index) => (

                                    <ul key={index} className="tree" >
                                        <li className="first-source-tree">
                                            <Box paddingBlockEnd="200">
                                                <InlineStack blockAlign='center' gap='200'>
                                                    <div>
                                                        <Icon
                                                            source={DatabaseIcon}
                                                            tone="base"
                                                        />
                                                    </div>
                                                    <div className="label">Account:</div>
                                                    <div className="name">{acc.accountName}</div>
                                                    {acc.sourcesInLoop.length === 0 && (
                                                        <span onClick={() => handleDeleteById("account", acc.id)} className="button-delete">
                                                            <Icon
                                                                source={DeleteIcon}
                                                                tone="critical"
                                                            />
                                                        </span>
                                                    )}

                                                </InlineStack>
                                            </Box>
                                            {acc.sourcesInLoop?.map((source, index) => (
                                                <ul key={index} style={{ paddingInlineStart: '10px' }}>
                                                    <li style={{ listStyle: 'none' }} className="sub-source-tree">
                                                        <span>
                                                            <img style={{ marginRight: '8px' }} src="https://widget.onecommerce.io/assets/gallery-thumb-BSZc8u2k.svg" alt="image" />
                                                        </span>
                                                        <span className="label">Source:</span>
                                                        <span className="name"> {source.sourceName}</span>
                                                        {source.galleries.length === 0 && (
                                                            <span onClick={() => handleDeleteById("source", source.id)} style={{ marginLeft: '8px' }} className="button-delete">
                                                                <img src="https://widget.onecommerce.io/assets/delete-icon-tqm6UhHJ.svg" alt="" />
                                                            </span>
                                                        )}
                                                        {source.galleries?.map((gallery, index) => (
                                                            <ul key={index} style={{ paddingInlineStart: '20px' }}>
                                                                <li style={{ listStyle: 'none' }} className="sub-source-tree">
                                                                    <span>
                                                                        <img style={{ marginRight: '8px' }} src="https://widget.onecommerce.io/assets/gallery-thumb-BSZc8u2k.svg" alt="image" />
                                                                    </span>
                                                                    <span className="label">Gallery:</span>
                                                                    <span className="name"> {gallery.galleyName}</span>
                                                                    {gallery.widgetSettings.length === 0 && (
                                                                        <span onClick={() => handleDeleteById("gallery", gallery.id)} style={{ marginLeft: '8px' }} className="button-delete">
                                                                            <img src="https://widget.onecommerce.io/assets/delete-icon-tqm6UhHJ.svg" alt="" />
                                                                        </span>
                                                                    )}
                                                                    {gallery.widgetSettings?.map((widget, index) => (
                                                                        <ul key={index} style={{ paddingInlineStart: '20px' }}>
                                                                            <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="sub-source-tree">
                                                                                <span>
                                                                                    <Icon
                                                                                        source={ImageIcon}
                                                                                        tone="base"
                                                                                    />
                                                                                </span>
                                                                                <span className="label">Widget:</span>
                                                                                <span className="name">{widget.widgetName}</span>
                                                                                <span onClick={() => handleDeleteById("widget", widget.id)} className="button-delete" style={{cursor:'pointer'}}>
                                                                                    <Icon
                                                                                        source={DeleteIcon}
                                                                                        tone="critical"
                                                                                    />
                                                                                </span>
                                                                            </li>
                                                                        </ul>
                                                                    ))}
                                                                </li>
                                                            </ul>
                                                        ))}
                                                    </li>
                                                </ul>
                                            ))}
                                        </li>
                                    </ul>
                                ))}
                            </div>
                        </div>
                    </Box>
                )}
                <TitleBar title="Action required before deleting account">
                    <button loading={(fetcher.state === "submitting") ? ("true") : undefined} onClick={() => { }} tone="critical" variant="primary">Confirm</button>
                    <button disabled={false} onClick={() => { shopify.modal.hide('modal-confirm-delete-sub') }}>Cancel</button>
                </TitleBar>
            </Modal>
        </>
    );
}
