import {
    Page, LegacyCard,
    IndexTable,
    useIndexResourceState,
    Text,
    Box,
    Button,
    Popover, ActionList,
    TextField,
    BlockStack,
    Card,
    InlineStack,
    ChoiceList,
    InlineGrid,
    EmptyState,
    Divider,
    Scrollable,
    Select,
    Checkbox,
    Icon,
    Spinner
} from '@shopify/polaris';
import { PlusIcon, MenuVerticalIcon, DatabaseIcon, ImageIcon, DeleteIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useEffect } from 'react';
import { Modal, TitleBar, useAppBridge, SaveBar } from '@shopify/app-bridge-react';
import { useNavigate, Outlet, useParams, useLoaderData, useFetcher, Form, useActionData } from "@remix-run/react";
import styles from '../style/style-widget.css?url'
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import axios from 'axios';
export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request, params }) {
    const { session } = await authenticate.admin(request);
    const account = await db.account.findMany({
        where: { sessionId: session?.id },
    });
    const sources = await db.source.findMany({});
    const sourcesAndAccountName = await Promise.all(
        sources.map(async (source) => {
            const account = await db.account.findFirst({
                where: { id: source.accountId },
            });
            const gallery = await db.gallery.findMany({
                where: { sourceId: source.id },
            });
            return { ...source, accountName: account.accountName, gallerys: gallery.length };
        })
    );

    const widget = await db.account.findFirst({
        where: { sessionId: session.id },
    })
    const accessToken = widget?.accessToken
    let posts = null;

    if (accessToken) {
        try {
            const response = await axios.get('https://graph.instagram.com/me', {
                params: {
                    fields: 'profile_picture_url,username,media{caption,media_type,media_url,comments_count,like_count,timestamp}',
                    access_token: accessToken
                }
            });

            posts = response?.data;
        } catch (error) {
            console.error('Lỗi khi lấy bài viết:', error.response?.data || error.message);
            throw error;
        }
    }
    const url = new URL(request.url);
    const searchParams = new URLSearchParams(url.search);
    const sourcename = searchParams.get('sourcename');
    const accountname = searchParams.get('accountname');
    return json({ account, source: sourcesAndAccountName, posts, sourcename });
}

export async function action({ request }) {
    const formData = Object.fromEntries(await request.formData());
    const action = formData?._action?.toString() ?? "";
    const accountName = formData?.accountName?.toString() ?? "";
    const sourceName = formData?.sourceName?.toString() ?? "";
    const idToDelete = formData?.idToDelete ? formData.idToDelete.split(',').map(Number) : [];

    try {
        //Tìm account trong database ứng với accountName
        const account = await db.account.findFirst({
            where: {
                accountName: accountName
            }
        })
        const accessToken = account?.accessToken

        let posts = null;
        if (accessToken) {
            try {
                const response = await axios.get('https://graph.instagram.com/me', {
                    params: {
                        fields: 'media{caption,media_type,media_url,comments_count,like_count,timestamp}',
                        access_token: accessToken
                    }
                });

                posts = response?.data;

            } catch (error) {
                console.error('Lỗi khi lấy bài viết:', error.response?.data || error.message);
                throw error;
            }
        }

        if (action === "delete") {
            const sourceToDeletes = await db.source.findMany({
                where: {
                    id: {
                        in: idToDelete
                    }
                }
            })
            const gallerys = await db.gallery.findMany({
                where: {
                    sourceId: {
                        in: idToDelete
                    }
                }
            })
            if (gallerys.length > 0) {
                const sourcesWithGallerys = await Promise.all(sourceToDeletes.map(async (source) => {
                    const galleries = await Promise.all(gallerys.filter(gallery => gallery.sourceId === source.id).map(async (gallery) => {
                        const widgetSettings = await db.widgetSetting.findMany({
                            where: { galleryId: gallery.id },
                        });
                        return { ...gallery, widgetSettings };
                    }));
                    return { ...source, galleries };
                }));

                return json({
                    success: false,
                    message: `Delete source failed. Please delete all gallerys before delete source.`,
                    sourcesWithGallerys: sourcesWithGallerys,
                });
            } else {
                await db.source.deleteMany({
                    where: {
                        id: {
                            in: idToDelete
                        }
                    }
                });
                return json({
                    success: true,
                    message: `Delete source successfully.`,
                });
            }
        } else if (action === "create") {
            const existingSource = await db.source.findFirst({
                where: {
                    sourceName: sourceName,
                    accountId: account.id,
                }
            });

            if (existingSource) {
                return json({
                    success: false,
                    message: `Source with the same name already exists.`,
                });
            }

            await db.source.create({
                data: {
                    items: posts?.media.data.length,
                    sourceName: sourceName,
                    accountId: account.id,
                }
            });

            return json({
                success: true,
                message: `Create source successfully.`,
            });
        }
    } catch (error) {
        console.error("Cannot create source to database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
}

export default function PageExample() {
    const { account, source, posts, sourcename } = useLoaderData();

    const [createView, setCreateView] = useState(false);
    const [textFieldValue, setTextFieldValue] = useState(sourcename || '');
    const handleTextFieldChange = useCallback((value) => setTextFieldValue(value), []);
    const [checked, setChecked] = useState(false);
    const handleChangeCheck = useCallback((newChecked) => setChecked(newChecked), []);
    const headerMarkup = <div>Header</div>;
    const headerMarkupEmail = <div>Email Header</div>;
    const url = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1711527026305376&redirect_uri=https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish";
    const shopify = useAppBridge();
    const navigate = useNavigate();
    const params = useParams();
    const fetcher = useFetcher();
    const [sourceToDeletes, setSourceToDeletes] = useState(fetcher.data?.sourcesWithGallerys);

    useEffect(() => {
        shopify.loading(false);
        if (fetcher.state === "loading") {
            switch (fetcher.data?.message) {
                case "Create source successfully.":
                    shopify.toast.show(fetcher.data?.message, { duration: 2500 });
                    break;
                case "Source with the same name already exists.":
                    shopify.toast.show(fetcher.data?.message, { duration: 2500 });
                    break;
                case "Delete source successfully.":
                    clearSelection();
                    shopify.toast.show(fetcher.data?.message, { duration: 2500 });
                    shopify.modal.hide('modal-confirm-delete');
                    shopify.modal.hide('modal-confirm-delete-sub');
                    break;
                case "Delete source failed. Please delete all gallerys before delete source.":
                    shopify.modal.hide('modal-confirm-delete');
                    shopify.modal.show('modal-confirm-delete-sub');
                    break;
                default:
                    break;
            }
        }

    }, [fetcher.state, fetcher.data]);

    useEffect(() => {
        if (fetcher.data?.sourcesWithGallerys) {
            setSourceToDeletes(fetcher.data.sourcesWithGallerys);
        }
    }, [fetcher.data, sourceToDeletes]);

    useEffect(() => {
        shopify.loading(false);
    }, [shopify]);

    const handleCreateSource = async () => {
        try {
            const formData = new FormData();
            formData.append("sourceName", sourceNameValue);
            formData.append("_action", "create");
            formData.append("accountName", selectedAccounts[0]);
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true);
        } catch (error) {
            console.error("Error deleting account:", error);
        }
    };

    const handleDeleteSource = async (id) => {
        try {
            const formData = new FormData();
            formData.append("_action", "delete");
            formData.append("idToDelete", id);
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true);
        } catch (error) {
            console.error("Error deleting account:", error);
        }
    };

    const [reload, setReload] = useState(false);

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
                handleDeleteSource(selectedResources);
                // Cập nhật sourceToDeletes sau khi xóa
                shopify.toast.show(result.message, { duration: 2500 });
                shopify.loading(false);
                setReload(false);
                return result;
            }
        } catch (error) {
            console.error("Error deleting :", error);
        }
    }

    const [showError, setShowError] = useState({});
    const [sourceNameValue, setSourceNameValue] = useState('');
    const handleSourceNameChange = useCallback(
        (value) => {
            setSourceNameValue(value);
            if (showError) {
                setShowError(false);
            } else if (value === '') {
                setShowError(true);
            }
        },
        [showError],
    );

    const [showErrorAccount, setShowErrorAccount] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState([account[0].accountName]);
    const handleChange = useCallback((value) => {
        setSelectedAccounts(value);
        if (showErrorAccount) {
            setShowErrorAccount(false);
        } else if (value === '') {
            setShowErrorAccount(true);
        }
    }, [showErrorAccount]);

    const validataForm = (sourceName, accountName) => {
        if (sourceName === "") setShowError({ error: true, message: "Source name is required" });
        if (checkSameName(sourceName)) setShowError({ error: true, message: "Source name is already exists" });
        return sourceName !== "" && accountName.length > 0 && !checkSameName(sourceName);
    };

    const checkSameName = (sourceName) => {
        return source.some((source) => source.sourceName === sourceName);
    }

    const orders = source?.map((item) => ({
        Name: item.sourceName,
        Type: 'Instagram',
        Account: item.accountName,
        Item: item.items,
        Gallery: item.gallerys,
        id: item.id
    }));

    const resourceName = {
        singular: 'order',
        plural: 'orders',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } = useIndexResourceState(orders);
    const [activePopoverId, setActivePopoverId] = useState(null);
    const openPopover = (id) => setActivePopoverId(id);
    const closePopover = () => setActivePopoverId(null);

    const rowMarkup = orders.map(
        ({ id, Name, Type, Account, Item, Gallery }, index) => {
            const activator = (
                <Button
                    icon={MenuVerticalIcon}
                    onClick={(e) => {
                        e.stopPropagation();
                        activePopoverId === id ? closePopover() : openPopover(id);
                    }}
                />
            );

            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    selected={selectedResources.includes(id)}
                    position={index}
                    onClick={() => {
                        navigate(`/app/source/edit/${id}`);
                        shopify.loading(true);
                    }}
                >
                    <IndexTable.Cell>
                        <Text alignment='center' variant="bodyMd" fontWeight="bold" as="span">
                            {Name}
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{Type}</IndexTable.Cell>
                    <IndexTable.Cell>{Account}</IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text as="span" numeric>
                            {Item}
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{Gallery}</IndexTable.Cell>
                    <IndexTable.Cell>
                        <Popover
                            active={activePopoverId === id}
                            activator={activator}
                            autofocusTarget="first-node"
                            onClose={closePopover}
                        >
                            <ActionList
                                actionRole="menuitem"
                                items={[
                                    { content: "Edit", onAction: () => console.log("Edit clicked") },
                                    { content: "Pause", onAction: () => console.log("Pause clicked") },
                                    { content: "Delete", onAction: () => console.log("Delete clicked") },
                                ]}
                            />
                        </Popover>
                    </IndexTable.Cell>
                </IndexTable.Row>
            );
        }
    );

    const promotedBulkActions = [
        {
            content: 'Delete',
            onAction: () => shopify.modal.show('modal-confirm-delete'),
            destructive: true
        }
    ];

    if (params.sourceId) {
        return <Outlet />;
    }

    return (
        <div>
            {createView ? (
                <Page
                    backAction={{ content: 'Products', url: '/app/source', onAction: () => { setCreateView(false); } }}
                    title="Add new media source"
                >
                    <div>
                        <InlineGrid gap="400" columns={['oneThird', 'twoThirds']}>
                            <Card padding="0">
                                <Box padding="400">
                                    <Text variant="headingLg" as="h5">
                                        Setting
                                    </Text>
                                </Box>
                                <Divider borderColor="border" />
                                <Box paddingInline="400" paddingBlock="400">
                                    <Scrollable style={{ height: 'calc(-220px + 100vh)' }}>
                                        <Box width='99%'>
                                            <BlockStack gap="500">
                                                <TextField
                                                    label="Source name"
                                                    value={textFieldValue}
                                                    onChange={handleTextFieldChange}
                                                    maxLength={20}
                                                    autoComplete="off"
                                                    showCharacterCount
                                                    error={showError.error && showError.message}
                                                />
                                                <Select
                                                    label="Media sourse type"
                                                    disabled
                                                    options={[
                                                        { label: 'Instagram', value: 'Instagram' },
                                                        { label: 'Facebook', value: 'Facebook' },
                                                        { label: 'Tiktok', value: 'Tiktok' },
                                                    ]}
                                                />
                                                <Box>
                                                    <BlockStack>
                                                        {headerMarkup}
                                                    </BlockStack>
                                                </Box>
                                                <Select
                                                    disabled
                                                    options={[
                                                        { label: 'Today', value: 'today' },
                                                        { label: 'Yesterday', value: 'yesterday' },
                                                        { label: 'Last 7 days', value: 'lastWeek' },
                                                    ]}
                                                />
                                                <Text variant="bodyMd" as="span">
                                                    Last updated on December 12, 2024 01:21
                                                </Text>
                                                <Button disabled fullWidth>Start Sync</Button>
                                                <Divider borderColor="border" />
                                                <Box>
                                                    <BlockStack>
                                                        {headerMarkupEmail}
                                                    </BlockStack>
                                                </Box>
                                                <TextField
                                                    disabled
                                                    placeholder="exemple@gmail.com"
                                                    autoComplete="off"
                                                />
                                            </BlockStack>
                                        </Box>
                                    </Scrollable>
                                </Box>
                            </Card>

                            <Card padding="0">
                                <Box padding="400">
                                    <Text variant="headingLg" as="h5">
                                        Preview sourse
                                    </Text>
                                </Box>
                                <Divider borderColor="border" />
                                <Box padding="400">
                                    <Checkbox
                                        label="Select all"
                                        checked={checked}
                                        onChange={handleChangeCheck}
                                    />
                                </Box>
                                <Scrollable style={{ height: 'calc(-220px + 100vh)' }}>
                                    <div className="list-media-source">
                                        {posts?.media?.data.map((post, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleChange(post)}
                                                style={{ backgroundImage: `url(${post.media_url})` }}
                                                className="list-media-source-item"
                                            >
                                            </div>
                                        ))}
                                    </div>
                                </Scrollable>
                            </Card>
                        </InlineGrid>
                    </div>
                </Page>
            ) : (
                <Page
                    title="All media sources"
                    primaryAction={<Button icon={PlusIcon} variant="primary" onClick={() => { shopify.modal.show('my-modal'); setSourceNameValue('') }}>Add new source</Button>}
                    fullWidth
                >
                    {source.length > 0 ? (
                        <Box paddingBlockEnd="400">
                            <Card>
                                <IndexTable
                                    resourceName={resourceName}
                                    itemCount={orders.length}
                                    selectedItemsCount={
                                        allResourcesSelected ? 'All' : selectedResources.length
                                    }
                                    promotedBulkActions={promotedBulkActions}
                                    onSelectionChange={handleSelectionChange}
                                    headings={[
                                        { title: 'Name', alignment: 'center' },
                                        { title: 'Type' },
                                        { title: 'From account' },
                                        { title: 'Items' },
                                        { title: 'In gallery' },
                                        { title: 'Action' },
                                    ]}
                                    pagination={{
                                        hasNext: true,
                                        onNext: () => { },
                                    }}
                                >
                                    {rowMarkup}
                                </IndexTable>
                            </Card>
                        </Box>
                    ) : (
                        <Card sectioned>
                            <EmptyState
                                heading="Manage your inventory transfers"
                                action={{ content: 'Add transfer' }}
                                secondaryAction={{
                                    content: 'Learn more',
                                    url: 'https://help.shopify.com',
                                }}
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <p>Track and receive your incoming inventory from suppliers.</p>
                            </EmptyState>
                        </Card>
                    )}
                </Page>
            )}
            <Modal id="my-modal">
                <BlockStack>
                    <Box padding='400' background="bg-surface" borderRadius="100">
                        <Card>
                            <TextField
                                label="Name your media source"
                                error={showError.error && showError.message}
                                value={sourceNameValue}
                                onChange={handleSourceNameChange}
                                placeholder="Please enter..."
                                autoComplete="off"
                            />
                        </Card>
                    </Box>
                    <Box padding='400' background="bg-surface" borderRadius="100">
                        <Card>
                            <BlockStack gap='200'>
                                <InlineStack align="space-between">
                                    <Text variant="headingMd" as="h6">
                                        Account
                                    </Text>
                                    <Button onClick={() => window.open(url, "_parent")} icon={PlusIcon} variant="plain">Add new account</Button>
                                </InlineStack>
                                <Card>
                                    <BlockStack gap='200'>
                                        <Text variant="bodyMd" as="p">
                                            Select profile
                                        </Text>
                                        {account.length > 0 ? (
                                            <InlineGrid gap='100' columns={2}>
                                                {account?.map((acc, index) => (
                                                    <Box key={index} borderStyle='solid' borderRadius="200" borderWidth='25' padding='200'>
                                                        <InlineStack align='space-between'>
                                                            <InlineStack gap='200' blockAlign='center'>
                                                                <div className='item-select-profile-name'>I</div>
                                                                <div className='item-select-profile-username'>{acc.accountName}</div>
                                                            </InlineStack>
                                                            <ChoiceList
                                                                choices={[
                                                                    { label: '', value: acc.accountName },
                                                                ]}
                                                                selected={selectedAccounts}
                                                                onChange={(value) => handleChange(value)}
                                                                error={showErrorAccount && "Chose a account"}
                                                            />
                                                        </InlineStack>
                                                    </Box>
                                                ))}
                                            </InlineGrid>
                                        ) : (
                                            <InlineStack blockAlign='center' align="space-between">
                                                <InlineStack>
                                                    <div>Connect your Instagram account first.</div>
                                                </InlineStack>
                                                <Button onClick={() => window.open(url, "_parent")} variant="primary">Connect</Button>
                                            </InlineStack>
                                        )}
                                    </BlockStack>
                                </Card>
                            </BlockStack>
                        </Card>
                    </Box>
                </BlockStack>
                <TitleBar title="Add new media source">
                    <button
                        type="submit"
                        onClick={(e) => {
                            if (validataForm(sourceNameValue, selectedAccounts)) {
                                shopify.saveBar.show('my-save-bar');
                                setTextFieldValue(sourceNameValue);
                                navigate(`/app/source?sourcename=${sourceNameValue}&accountname=${selectedAccounts[0]}`);
                                setCreateView(true);
                                shopify.modal.hide('my-modal');
                            } else {
                                console.log("Form validation failed!");
                            }
                        }}
                        variant="primary"
                    >
                        Next
                    </button>
                    <button onClick={() => shopify.modal.hide('my-modal')}>Cancel</button>
                </TitleBar>
            </Modal>

            <Modal id="modal-confirm-delete">
                <Box padding='400'>
                    <p>This can't be undone.</p>
                </Box>
                <TitleBar title="Delete selected widget(s)?">
                    <button loading={(fetcher.state === "submitting") ? ("true") : undefined} onClick={() => { handleDeleteSource(selectedResources); }} tone="critical" variant="primary">Confirm</button>
                    <button disabled={false} onClick={() => { clearSelection(); shopify.modal.hide('modal-confirm-delete') }}>Cancel</button>
                </TitleBar>
            </Modal>

            <Modal id="modal-confirm-delete-sub">
                {reload ? (<InlineStack blockAlign='center' align='center'><Spinner accessibilityLabel="Spinner example" size="large" /></InlineStack>) : (
                    <Box padding='400'>
                        <div className="modal-required-delete-source">
                            <p className='modal-required-delete-source-title' style={{ marginBottom: '16px' }}>Remove the items listed below before deleting the media source(s) to ensure your data is accurate, consistent, and complete.</p>
                            <div className="modal-required-delete-source-list-tree">
                                {sourceToDeletes?.map((source, index) => (

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
                                                    <div className="label">Media source:</div>
                                                    <div className="name">{source.sourceName}</div>
                                                    {source.galleries.length === 0 && (
                                                        <span onClick={() => handleDeleteById("source", source.id)} className="button-delete">
                                                            <Icon
                                                                source={DeleteIcon}
                                                                tone="critical"
                                                            />
                                                        </span>
                                                    )}

                                                </InlineStack>
                                            </Box>
                                            {source.galleries?.map((gallery, index) => (
                                                <ul key={index} style={{ paddingInlineStart: '10px' }}>
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
                                                                    <span onClick={() => handleDeleteById("widget", widget.id)} className="button-delete">
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
                            </div>
                        </div>
                    </Box>
                )}
                <TitleBar title="Action required before deleting media source(s)">
                    <button loading={(fetcher.state === "submitting") ? ("true") : undefined} onClick={() => { handleDeleteSource(selectedResources); clearSelection() }} tone="critical" variant="primary">Confirm</button>
                    <button disabled={false} onClick={() => { clearSelection(); shopify.modal.hide('modal-confirm-delete-sub') }}>Cancel</button>
                </TitleBar>
            </Modal>

            <SaveBar id="my-save-bar">
                <button
                    loading={fetcher.state === "submitting"}
                    variant="primary"
                    onClick={() => {
                        if (validataForm(textFieldValue, selectedAccounts)) {
                            handleCreateSource();
                            shopify.saveBar.hide('my-save-bar');
                            navigate(`/app/source`);
                            setCreateView(false)
                        }
                    }}
                >
                    Save source
                </button>
                <button
                    onClick={() => {
                        shopify.saveBar.hide('my-save-bar');
                        navigate(`/app/source`);
                        setCreateView(false)
                    }}
                >
                    Discard
                </button>
            </SaveBar>
        </div>
    );
}

