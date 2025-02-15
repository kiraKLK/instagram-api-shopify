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
    SkeletonPage,
    Layout,
    SkeletonBodyText,
    Divider,
    SkeletonThumbnail,
    SkeletonDisplayText
} from '@shopify/polaris';
import { PlusIcon, MenuVerticalIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useEffect } from 'react';
import { Modal, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useNavigate, Outlet, useParams } from "@remix-run/react";
import styles from '../style/style-widget.css?url'
export const links = () => [{ rel: "stylesheet", href: styles }];


export default function PageExample() {
    //Tạo biến để sử dụng modal và savebar
    const shopify = useAppBridge()
    //Xử dụng hook useSubmit để đấy dữ liệu từ hàm front sang action ở back
    const navigate = useNavigate();
    const params = useParams();

    useEffect(() => {
        shopify.loading(false)
    }, [shopify]);
    //Source name
    const [sourceNameValue, setSourceNameValue] = useState('');
    const handleSourceNameChange = useCallback(
        (value) => setSourceNameValue(value),
        [],
    );
    //Chọn account tạo source
    const [selected, setSelected] = useState(['hidden']);
    const handleChange = useCallback((value) => setSelected(value), []);
    const orders = [
        {
            Name: 'Test source',
            Type: 'Instagram',
            Account: 'Tungvan2024',
            Item: '6',
            updated: 'Now',
            id: '1'
        }
    ];
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
                    onClick={() => {navigate(`/app/gallary/${id}`); shopify.loading(true)}}
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

    const Skeleton = () => {
        return (
            <SkeletonPage backAction title="Edit Media Source" primaryAction>
                <div style={{ height: '90vh' }}>
                    <Layout>
                        <Layout.Section variant="oneThird">
                            <Card>
                                <Box padding="400">
                                    <Text variant="headingLg" as="h5">
                                        Setting
                                    </Text>
                                </Box>
                                <Divider borderColor="border" />
                                <Box paddingBlockStart='400'>
                                    <BlockStack gap='200'>
                                        <SkeletonDisplayText size="small" />
                                        <SkeletonBodyText />
                                        <SkeletonDisplayText size="small" />
                                        <SkeletonBodyText />
                                        <SkeletonDisplayText size="small" />
                                        <SkeletonBodyText />
                                        <SkeletonDisplayText size="small" />
                                        <SkeletonBodyText />
                                        <SkeletonDisplayText size="small" />
                                        <SkeletonDisplayText size="small" />

                                    </BlockStack>
                                </Box>
                            </Card>
                        </Layout.Section>
                        <Layout.Section >
                            <Card >
                                <Box padding="400">
                                    <Text variant="headingLg" as="h5">
                                        Preview source
                                    </Text>
                                </Box>
                                <Divider borderColor="border" />
                                <Box paddingBlockStart='400'>
                                    <BlockStack gap='200'>
                                        <InlineStack align='space-between'>
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                        </InlineStack>
                                        <InlineStack align='space-between'>
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                        </InlineStack>
                                        <InlineStack align='space-between'>
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                        </InlineStack>
                                        <InlineStack align='space-between'>
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                        </InlineStack>
                                        <InlineStack align='space-between'>
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                            <SkeletonThumbnail size="large" />
                                        </InlineStack>
                                    </BlockStack>
                                </Box>

                            </Card>
                        </Layout.Section>
                    </Layout>
                </div>
            </SkeletonPage>
        )
    }

    if (params.gallaryId) {
        return <Outlet />
    }
    return (
        <>
            <Page
                title="All media sources"
                primaryAction={<Button icon={PlusIcon} variant="primary" onClick={() => { shopify.modal.show('my-modal'); }}>Add new account</Button>}
                fullWidth
            >
                <Box paddingBlockEnd="400">
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
                </Box>
            </Page>
            <Modal id="my-modal">
                <BlockStack>
                    <Box padding='400' background="bg-surface" borderRadius="100">
                        <Card>
                            <TextField
                                label="Name your media source"
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
                                    <Button icon={PlusIcon} variant="plain">Add new account</Button>
                                </InlineStack>
                                <Card>
                                    <BlockStack gap='200'>
                                        <Text variant="bodyMd" as="p">
                                            Select profile
                                        </Text>
                                        <InlineGrid columns={2}>
                                            <Box borderStyle='solid' borderRadius="200" borderWidth='25' padding='200'>
                                                <InlineStack align='space-between'>
                                                    <InlineStack gap='200' blockAlign='center'>
                                                        <div className='item-select-profile-name'>I</div>
                                                        <div className='item-select-profile-username'>Tungvan2024</div>
                                                    </InlineStack>
                                                    <ChoiceList
                                                        choices={[
                                                            { label: '', value: 'hidden' },
                                                        ]}
                                                        selected={selected}
                                                        onChange={handleChange}
                                                    />
                                                </InlineStack>
                                            </Box>
                                        </InlineGrid>
                                    </BlockStack>
                                </Card>
                            </BlockStack>
                        </Card>
                    </Box>
                </BlockStack>
                <TitleBar title="Add new media source">
                    <button onClick={() => { shopify.modal.hide('my-modal') }} variant="primary">Next</button>
                    <button onClick={() => shopify.modal.hide('my-modal')}>Cancel</button>
                </TitleBar>
            </Modal>
        </>
    );

}