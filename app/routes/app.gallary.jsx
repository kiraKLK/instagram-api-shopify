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
    EmptyState
} from '@shopify/polaris';
import { PlusIcon, MenuVerticalIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useEffect } from 'react';
import { Modal, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useNavigate, Outlet, useParams, useLoaderData, useFetcher, Form } from "@remix-run/react";
import styles from '../style/style-widget.css?url'
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import axios from 'axios';
export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const account = await db.account.findMany({
        where: { sessionId: session?.id },
    });
    const source = await db.source.findMany({

    });

    const gallery = await db.gallery.findMany({

    });

    return json({ account, source, gallery });
}

export async function action({ request }) {
    const formData = Object.fromEntries(await request.formData());
    const sourceName = formData?.sourceName?.toString() ?? "";
    const galleryName = formData?.galleryName?.toString() ?? "";
    console.log("🚀 ~ action ~ galleryName:", galleryName)
    console.log("🚀 ~ action ~ sourceName:", sourceName)

    try {
        const source = await db.source.findFirst({
            where: {
                sourceName: sourceName
            }
        })
        console.log("🚀 ~ action ~ source:", source)

        await db.gallery.create({
            data: {
                galleyName: galleryName,
                sourceId: source.id,
                taggerProducts:""
            }
        })

        return json({
            success: true,
            message: `Create gallery successfully.`,
        });
    } catch (error) {
        console.error("Cannot create source to database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
}


export default function PageExample() {
    const url = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1711527026305376&redirect_uri=https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish";
    //Tạo biến để sử dụng modal và savebar
    const shopify = useAppBridge()
    //Xử dụng hook useSubmit để đấy dữ liệu từ hàm front sang action ở back
    const navigate = useNavigate();
    const params = useParams();

    const { account, source, gallery } = useLoaderData();

    const fetcher = useFetcher();
    useEffect(() => {
        if (fetcher.state === "loading") {
            // Hiển thị toast khi lưu và load dữ liệu thành công
            shopify.toast.show(fetcher.data?.message, {
                duration: 2500,
            })
            shopify.loading(false) // tắt loading
        }
    }, [shopify, fetcher.state, fetcher.data?.message])

    useEffect(() => {
        shopify.loading(false)
    }, [shopify]);

    const handleCreateSource = async () => {
        try {
            const formData = new FormData();
            formData.append("galleryName", sourceNameValue);
            formData.append("sourceName", selectedAccounts[0]);
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true)
        } catch (error) {
            console.error("Error deleting account:", error);
        }
    };
    //Source name
    const [showError, setShowError] = useState(false);
    const [sourceNameValue, setSourceNameValue] = useState('');
    const handleSourceNameChange = useCallback(
        (value) => {
            setSourceNameValue(value);
            if (showError) {
                // Xóa lỗi khi người dùng bắt đầu nhập lại
                setShowError(false)
            } else if (value === '') {
                //Hiện thị lại lỗi nếu người dùng xóa hết
                setShowError(true)
            }
        },
        [showError],
    );
    //Chọn account tạo source
    // State để lưu trạng thái chọn của từng tài khoản
    const [showErrorAccount, setShowErrorAccount] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState([account[0].accountName]);
    // Xử lý khi thay đổi giá trị ChoiceList
    const handleChange = useCallback((value) => {
        setSelectedAccounts(value);
        if (showErrorAccount) {
            // Xóa lỗi khi người dùng bắt đầu nhập lại
            setShowErrorAccount(false)
        } else if (value === '') {
            //Hiện thị lại lỗi nếu người dùng xóa hết
            setShowErrorAccount(true)
        }
    }, [showErrorAccount]);

    const validataForm = (sourceName, accountName) => {
        if (sourceName === "") setShowError(true)
        //if (accountName.length === 0) setShowErrorAccount(true)
        return (
            sourceName !== ""
            //accountName.length > 0
        )
    }

    const orders = gallery.map((item) =>
    ({
        Name: item.galleryName,
        Type: 'Instagram',
        Account: 'Tungvan2024',
        Item: 12,
        updated: 'Now',
        id: item.id
    })
    );

    const resourceName = {
        singular: 'order',
        plural: 'orders',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(orders);
    // State để quản lý Popover được mở
    const [activePopoverId, setActivePopoverId] = useState(null);
    // Hàm mở Popover cho một dòng cụ thể
    const openPopover = (id) => setActivePopoverId(id);
    // Hàm đóng Popover
    const closePopover = () => setActivePopoverId(null);

    const rowMarkup = orders.map(
        (
            { id, Name, Type, Account, Item, updated },
            index,
        ) => {
            //Biến lưu button icon popup
            const activator = (
                <Button
                    icon={MenuVerticalIcon}
                    onClick={(e) => {
                        e.stopPropagation(); // Ngăn sự kiện click từ bubble lên dòng
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
                    onClick={() => { navigate(`/app/gallary/${id}`); shopify.loading(true) }}
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
                    <IndexTable.Cell>{updated}</IndexTable.Cell>
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
            )
        });

    const promotedBulkActions = [
        {
            content: 'Delete',
            onAction: () => console.log('Todo: implement payment capture'),
            destructive: true
        }
    ];

    if (params.gallaryId) {
        return <Outlet />
    }
    return (
        <>
            <Page
                title="All gallery"
                primaryAction={<Button icon={PlusIcon} variant="primary" onClick={() => { shopify.modal.show('my-modal'); }}>Add new source</Button>}
                fullWidth
            >
                {gallery.length > 0 ? (<Box paddingBlockEnd="400">
                    <LegacyCard>
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
                                { title: 'Last updated' },
                                { title: 'Action' },
                            ]}
                            pagination={{
                                hasNext: true,
                                onNext: () => { },
                            }}
                        >
                            {rowMarkup}
                        </IndexTable>
                    </LegacyCard>
                </Box>) :
                    (<LegacyCard sectioned>
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
                    </LegacyCard>)

                }

            </Page>

            {/* <fetcher.Form action="/app/source/create" method="get"> */}
            <Modal id="my-modal">
                <BlockStack>
                    <Box padding='400' background="bg-surface" borderRadius="100">
                        <Card>
                            <TextField
                                label="Name your media source"
                                error={showError && "Source name is required"}
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
                                        Source
                                    </Text>
                                    <Button onClick={() => window.open(url, "_parent")} icon={PlusIcon} variant="plain">Add new gallery</Button>
                                </InlineStack>
                                <Card>
                                    <BlockStack gap='200'>
                                        <Text variant="bodyMd" as="p">
                                            Select source
                                        </Text>
                                        {source.length > 0 ?
                                            (
                                                <InlineGrid gap='100' columns={2}>
                                                    {source.map((ga, index) => (
                                                        <Box key={index} borderStyle='solid' borderRadius="200" borderWidth='25' padding='200'>
                                                            <InlineStack align='space-between'>
                                                                <InlineStack gap='200' blockAlign='center'>
                                                                    <div className='item-select-profile-name'>I</div>
                                                                    <div className='item-select-profile-username'>{ga.sourceName}</div>
                                                                </InlineStack>
                                                                <ChoiceList
                                                                    choices={[
                                                                        { label: '', value: ga.sourceName },
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
                                            )
                                        }
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
                            // e.preventDefault(); // Ngăn form submit mặc định
                            if (validataForm(sourceNameValue, selectedAccounts)) {
                                // console.log("Form submitted successfully!");
                                // document.querySelector("form").submit(); // Gửi form khi hợp lệ
                                handleCreateSource()

                            } else {
                                console.log("Form validation failed!");
                            }
                        }}
                        variant="primary"
                        loading={(fetcher.state === "submitting") ? ("true") : undefined}
                    >
                        Next
                    </button>
                    <button onClick={() => shopify.modal.hide('my-modal')}>Cancel</button>
                </TitleBar>
            </Modal>
            {/* </fetcher.Form> */}
        </>
    );

}