import { useState, useCallback, useEffect } from 'react';
import {
    InlineGrid,
    Text,
    InlineStack,
    Page,
    Box,
    Divider,
    Card,
    Scrollable,
    BlockStack,
    TextField,
    Select,
    useBreakpoints,
    Badge,
    Button,
    Checkbox,
    Modal,
    LegacyCard,
    EmptyState
} from '@shopify/polaris';
import {
} from '@shopify/polaris-icons';
import { json } from "@remix-run/node";
import styles from '../style/style.css?url'
import { useLoaderData } from "@remix-run/react";
import axios from 'axios';
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { useAppBridge } from '@shopify/app-bridge-react';

export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }) {
    const { session } = await authenticate.admin(request);
    const widget = await db.account.findFirst({
        where: { sessionId: session.id },
    })
    const accessToken = widget?.accessToken
    if (accessToken) {
        try {
            const response = await axios.get('https://graph.instagram.com/me', {
                params: {
                    fields: 'profile_picture_url,username,media{caption,media_type,media_url,comments_count,like_count,timestamp}',
                    access_token: accessToken
                }
            });

            const posts = response?.data;
            return json({ posts });
        } catch (error) {
            console.error('Lỗi khi lấy bài viết:', error.response?.data || error.message);
            throw error;
        }
    }

    return null;
}

export default function Source() {
    const shopify = useAppBridge()
    useEffect(() => {
        shopify.loading(false)
    }, [shopify]);

    const [active, setActive] = useState(false);
    const [currentPost, setCurrentPost] = useState(null)

    const handleChange = useCallback((post) => {
        setActive(!active)
        setCurrentPost(post)
    }, [active])

    const loaderData = useLoaderData();
    const posts = loaderData?.posts || []

    const [textFieldValue, setTextFieldValue] = useState(posts?.username);

    const handleTextFieldChange = useCallback(
        (value) => setTextFieldValue(value),
        [],
    );
    const [enabled, setEnabled] = useState(true);

    const handleToggle = useCallback(() => setEnabled((enabled) => !enabled), []);

    const contentStatus = enabled ? 'Turn off' : 'Turn on';

    const toggleId = 'setting-toggle-uuid';

    const { mdDown } = useBreakpoints();

    const badgeStatus = enabled ? 'success' : undefined;

    const badgeContent = enabled ? 'On' : 'Off';

    const title = 'Auto sync';

    const titleEmail = 'Get notified by email'

    const settingStatusMarkup = (
        <Badge
            tone={badgeStatus}
            toneAndProgressLabelOverride={`Setting is ${badgeContent}`}
        >
            {badgeContent}
        </Badge>
    );

    const settingTitle = title ? (
        <InlineStack gap="200" wrap={false}>
            <InlineStack gap="200" align="start" blockAlign="baseline">
                <label htmlFor={toggleId}>
                    <Text variant="headingMd" as="h6">
                        {title}
                    </Text>
                </label>
                <InlineStack gap="200" align="center" blockAlign="center">
                    {settingStatusMarkup}
                </InlineStack>
            </InlineStack>
        </InlineStack>
    ) : null;
    const settingTitleEmail = titleEmail ? (
        <InlineStack gap="200" wrap={false}>
            <InlineStack gap="200" align="start" blockAlign="baseline">
                <label htmlFor={toggleId}>
                    <Text variant="headingMd" as="h6">
                        {titleEmail}
                    </Text>
                </label>
                <InlineStack gap="200" align="center" blockAlign="center">
                    {settingStatusMarkup}
                </InlineStack>
            </InlineStack>
        </InlineStack>
    ) : null;

    const actionMarkup = (
        <Button
            disabled
            role="switch"
            id={toggleId}
            ariaChecked={enabled ? 'true' : 'false'}
            onClick={handleToggle}
            size="slim"
        >
            {contentStatus}
        </Button>
    );

    const headerMarkup = (
        <Box width="100%">
            <InlineStack
                gap="1200"
                align="space-between"
                blockAlign="start"
                wrap={false}
            >
                {settingTitle}
                {!mdDown ? (
                    <Box minWidth="fit-content">
                        <InlineStack align="end">{actionMarkup}</InlineStack>
                    </Box>
                ) : null}
            </InlineStack>
        </Box>
    )
    const headerMarkupEmail = (
        <Box width="100%">
            <InlineStack
                gap="1200"
                align="space-between"
                blockAlign="start"
                wrap={false}
            >
                {settingTitleEmail}
                {!mdDown ? (
                    <Box minWidth="fit-content">
                        <InlineStack align="end">{actionMarkup}</InlineStack>
                    </Box>
                ) : null}
            </InlineStack>
        </Box>
    )

    const [checked, setChecked] = useState(false);
    const handleChangeCheck = useCallback(
        (newChecked) => setChecked(newChecked),
        [],
    )

    if (!loaderData) {
        return (
            <>
                <Box padding='400'>
                    <Text variant="headingLg" as="h5">
                        Media sources
                    </Text>
                </Box>

                <LegacyCard sectioned>
                    <EmptyState
                        heading="Manage your inventory transfers"
                        action={{ content: 'Add transfer' }}
                        secondaryAction={{
                            content: 'Learn more',
                            url: 'https://help.shopify.com',
                        }}
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                        <p>No source media availble</p>
                    </EmptyState>
                </LegacyCard>

            </>
        )
    } else {
        const date = new Date(posts?.media?.data[0].timestamp)

        // Định dạng lại ngày giờ thành dạng thân thiện
        const options = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
        };
        const formattedDate = new Intl.DateTimeFormat("en-US", options).format(date);
        return (
            <>
                <Page
                    backAction={{ content: 'Products', url: '/app/source' }}
                    title="Edit Media Source"
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
                                <Box paddingInline="400" paddingBlock="400" >
                                    <Scrollable style={{ height: 'calc(-220px + 100vh)' }} >
                                        <Box width='99%' >
                                            <BlockStack gap="500">
                                                <TextField
                                                    label="Store name"
                                                    value={textFieldValue}
                                                    onChange={handleTextFieldChange}
                                                    maxLength={20}
                                                    autoComplete="off"
                                                    showCharacterCount
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
                                                    <BlockStack >
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
                                                    <BlockStack >
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

                {/* <Frame> */}
                {currentPost &&
                    <Modal
                        size="large"
                        open={active}
                        onClose={handleChange}
                    >
                        <Modal.Section style={{ padding: '0' }}>


                            <div className='modal'>
                                <div className='modal-left'>
                                    <div style={{ backgroundImage: `url(${currentPost.media_url})` }} className="modal-left-media"></div>
                                </div>
                                <div className="modal-right">
                                    <div className="modal-right-infor">
                                        <BlockStack >
                                            <div className="modal-right-infor-header">
                                                <InlineStack gap="400" wrap={false} blockAlign="center">
                                                    <div style={{ backgroundImage: `url(${posts.profile_picture_url})` }} className="modal-right-infor-header-avatar">
                                                    </div>
                                                    <div className="modal-right-infor-header-name">{posts.username}</div>
                                                </InlineStack>
                                            </div>
                                            <div className="modal-right-infor-content">
                                                <div className="modal-right-infor-content-total-reaction">
                                                    <Box padding="400" >
                                                        <InlineStack align='center' gap="600" wrap={false} blockAlign="center">
                                                            <BlockStack inlineAlign='center'>
                                                                <Text fontWeight="medium" as="p">
                                                                    {currentPost.like_count}
                                                                </Text>
                                                                <Text tone='subdued' as="p">
                                                                    Like
                                                                </Text>
                                                            </BlockStack>
                                                            <BlockStack inlineAlign='center'>
                                                                <Text fontWeight="medium" as="p">
                                                                    {currentPost.comments_count}
                                                                </Text>
                                                                <Text tone='subdued' as="p">
                                                                    Comment
                                                                </Text>
                                                            </BlockStack>
                                                        </InlineStack>
                                                    </Box>
                                                </div>
                                                <Scrollable style={{ height: "calc(-260px + 100vh)" }} >
                                                    <div>{currentPost.caption}</div>
                                                </Scrollable>
                                            </div>
                                            <div className="modal-right-infor-footer">
                                                {formattedDate}
                                            </div>
                                        </BlockStack>
                                    </div>
                                </div>
                            </div>

                        </Modal.Section>
                    </Modal>
                }


                {/* </Frame> */}
            </>

        )
    }

}


