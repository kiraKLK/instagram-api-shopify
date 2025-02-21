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
    Icon,
    InlineError,
    Spinner
} from '@shopify/polaris';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PlusIcon, MenuVerticalIcon, DatabaseIcon, ImageIcon, DeleteIcon } from '@shopify/polaris-icons';
import { Modal, TitleBar, useAppBridge, SaveBar } from '@shopify/app-bridge-react';
import { useNavigate, Outlet, useParams, useLoaderData, useFetcher, Form } from "@remix-run/react";
import styles from '../style/style-widget.css?url'
import styless from '../style/style-gallery.css?url'
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import axios from 'axios';
import GalleryTest from '../component/gallery';
export const links = () => [
    { rel: "stylesheet", href: styles },
    { rel: "stylesheet", href: styless }
];

export async function loader({ request }) {
    const { admin, session } = await authenticate.admin(request);
    try {
        const account = await db.account.findMany({
            where: { sessionId: session?.id },
        });
        const source = await db.source.findMany({

        });

        const gallery = await db.gallery.findMany({

        });

        return json({ account, source, gallery });
    } catch (error) {
        console.error('Lỗi khi lấy bài viết:', error.response?.data || error.message);
        throw error;
    }

}

export async function action({ request }) {
    const { admin, session } = await authenticate.admin(request);
    const formData = Object.fromEntries(await request.formData());
    const sourceName = formData?.sourceName?.toString() ?? "";
    const galleryName = formData?.galleryName?.toString() ?? "";
    const taggedProducts = formData?.taggedProducts?.toString() ?? "";
    const idToDelete = formData?.idToDelete ? formData.idToDelete.split(',').map(Number) : [];
    const actionType = formData?._action?.toString() ?? "";

    try {
        switch (actionType) {
            case "create": {
                const source = await db.source.findFirst({
                    where: {
                        sourceName: sourceName
                    }
                });
                await db.gallery.create({
                    data: {
                        galleyName: galleryName,
                        sourceId: source.id,
                        taggerProducts: taggedProducts
                    }
                });

                return Response.json({
                    success: true,
                    message: `Create gallery successfully.`,
                });
            }
            case "update": {
                return Response.json({
                    success: true,
                    message: `Update gallery successfully.`,
                });
            }
            case "delete": {
                const galleryToDeletes = await db.gallery.findMany({
                    where: {
                        id: {
                            in: idToDelete
                        }
                    }
                })
                const widget = await db.widgetSetting.findMany({
                    where: {
                        galleryId: {
                            in: idToDelete
                        }
                    }
                })
                if (widget.length > 0) {
                    const galleryWithWidget = await Promise.all(galleryToDeletes.map(async (gallery) => {
                        const widgetSettings = await db.widgetSetting.findMany({
                            where: { galleryId: gallery.id },
                        });
                        return { ...gallery, widgetSettings };
                    }));

                    return json({
                        success: false,
                        message: `Delete gallery failed.`,
                        galleryWithWidget: galleryWithWidget,
                    });
                } else {
                    await db.gallery.deleteMany({
                        where: {
                            id: {
                                in: idToDelete
                            }
                        }
                    });
                    return json({
                        success: true,
                        message: `Delete gallery successfully.`,
                    });
                }
            }
            case "selectBySourceName": {
                const source = await db.source.findFirst({
                    where: { sourceName: sourceName },
                })
                const account = await db.account.findFirst({
                    where: { id: source.accountId }
                })
                const accessToken = account?.accessToken
                const response = await axios.get('https://graph.instagram.com/me', {
                    params: {
                        fields: 'profile_picture_url,username,media{caption,media_type,media_url,comments_count,like_count,timestamp}',
                        access_token: accessToken
                    }
                });

                const posts = response?.data;
                const responseProducts = await admin.graphql(
                    `#graphql
                            query {
                                products (first: 50, query: "status:active AND published_status:published") {
                                    nodes {
                                    id
                                    title
                                    handle
                                    images(first: 1) {
                                        edges {
                                        node {
                                            src
                                        }
                                        }
                                    }
                                    variants(first: 1) {
                                        edges {
                                        node {
                                            price
                                        }
                                        }
                                    }
                                    }
                                }
                            }`,
                );
                const data = await responseProducts.json();
                const products = data.data.products

                return Response.json({
                    success: true,
                    message: `Select source successfully.`,
                    posts,
                    products
                });
            }
            default: {
                return Response.json({ error: "Invalid action type." }, { status: 400 });
            }
        }
    } catch (error) {
        console.error("Cannot create source to database!", error);
        return Response.json({ error: "Internal server error." }, { status: 500 });
    }
}


export default function PageExample() {
    const fetcher = useFetcher();
    const loaderData = useLoaderData(); //Lấy data từ loader
    const [posts, setPost] = useState([])   // Data bài viết instagram
    const productsLoader = fetcher.data?.products || [] // Data tất cả sản phẩm trong store
    const gallerys = loaderData?.gallerys ? JSON.parse(loaderData?.gallerys ?? {}) : {}
    const [createView, setCreateView] = useState(false);
    const [galleryToDeletes, setGalleryToDelete] = useState(fetcher.data?.galleryWithWidget)
    const url = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=1711527026305376&redirect_uri=https://admin.shopify.com/store/test-qr-app/apps/test-theme-28/app/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish";
    //Tạo biến để sử dụng modal và savebar
    const shopify = useAppBridge()
    //Xử dụng hook useSubmit để đấy dữ liệu từ hàm front sang action ở back
    const navigate = useNavigate();
    const params = useParams();

    const { account, source, gallery } = useLoaderData();


    useEffect(() => {
        if (fetcher.state === "loading") {
            switch (fetcher.data?.message) {
                case "Select source successfully.": {
                    setPost(fetcher.data?.posts)
                    shopify.modal.hide('my-modal')
                    break;
                }
                case "Create gallery successfully.": {
                    shopify.toast.show(fetcher.data?.message, {
                        duration: 2500,
                    })
                    shopify.saveBar.hide('my-save-bar');
                    setCreateView(false)
                }
                case "Delete gallery successfully.": {
                    clearSelection();
                    shopify.toast.show(fetcher.data?.message, { duration: 2500 });
                    shopify.modal.hide('modal-confirm-delete');
                    shopify.modal.hide('modal-confirm-delete-sub');
                }
                case "Delete gallery failed.": {
                    shopify.modal.hide('modal-confirm-delete');
                    shopify.modal.show('modal-confirm-delete-sub');
                    break;
                }
                default:
                    break;
            }
            // Hiển thị toast khi lưu và load dữ liệu thành công
            shopify.loading(false) // tắt loading
        }
    }, [shopify, fetcher.state, fetcher.data?.message])

    useEffect(() => {
        shopify.loading(false)
    }, [shopify]);

    const handleCreateGallery = async () => {
        try {
            const formData = new FormData();
            formData.append("_action", "create");
            formData.append("galleryName", galleryName);
            formData.append("sourceName", selectedSources[0]);
            formData.append("taggedProducts", JSON.stringify(taggedProducts))
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true)
        } catch (error) {
            console.error("Error deleting account:", error);
        }
    };
    const handleSelectSource = async (sourceName) => {
        try {
            const formData = new FormData();
            formData.append("_action", "selectBySourceName");
            formData.append("sourceName", sourceName);
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true)
        } catch (error) {
            console.error("Error deleting account:", error);
        }
    }
    const handleRemoveSource = useCallback(() => {
        setSelectedSources([])
        setPost({ ...posts, media: { ...posts.media, data: [] } });
    }, [posts]);
    //Source name
    const [showError, setShowError] = useState({});
    const [galleryName, setGalleryName] = useState('');
    const handleSourceNameChange = useCallback(
        (value) => {
            setGalleryName(value);
            if (value !== "") setShowError({ error: false, message: "" });
            if (value === "") setShowError({ error: true, message: "Gallery name is required" });
        },
        []
    );

    const validataForm = (sourceName, accountName) => {
        if (sourceName === "") setShowError({ error: true, message: "Gallery name is required" });
        if (checkSameName(sourceName)) setShowError({ error: true, message: "Gallery name is already exists" });
        if (accountName.length === 0) setShowErrorAccount({ error: true, message: "Select source is required" });
        return sourceName !== "" && accountName.length > 0 && !checkSameName(sourceName);
    };

    const checkSameName = (sourceName) => {
        return gallery.some((source) => source.galleyName === sourceName);
    }
    //Chọn account tạo source
    // State để lưu trạng thái chọn của từng tài khoản
    const [showErrorAccount, setShowErrorAccount] = useState({});
    const [selectedSources, setSelectedSources] = useState([]);
    // Xử lý khi thay đổi giá trị ChoiceList
    const handleChange = useCallback((value) => {
        setSelectedSources(value);
        if (value.length > 0) setShowErrorAccount({ error: false, message: "" });
        if (showErrorAccount.length === 0) setShowErrorAccount({ error: true, message: "Select source is required" });
    }, []);

    const orders = gallery?.map((item) => {
        const sourceItem = source.find(src => src.id === item.sourceId);
        return {
            Name: item.galleyName,
            Type: 'Instagram',
            fromSource: sourceItem ? sourceItem.sourceName : 'Unknown',
            Item: 12,
            updated: 'Now',
            id: item.id
        };
    });

    const resourceName = {
        singular: 'order',
        plural: 'orders',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange,clearSelection } =
        useIndexResourceState(orders);
    // State để quản lý Popover được mở
    const [activePopoverId, setActivePopoverId] = useState(null);
    // Hàm mở Popover cho một dòng cụ thể
    const openPopover = (id) => setActivePopoverId(id);
    // Hàm đóng Popover
    const closePopover = () => setActivePopoverId(null);

    const rowMarkup = orders.map(
        (
            { id, Name, Type, fromSource, Item, updated },
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
                    onClick={() => { navigate(`/app/gallery/${id}`); shopify.loading(true) }}
                >
                    <IndexTable.Cell>
                        <Text alignment='center' variant="bodyMd" fontWeight="bold" as="span">
                            {Name}
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{Type}</IndexTable.Cell>
                    <IndexTable.Cell>{fromSource}</IndexTable.Cell>
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
            onAction: () => shopify.modal.show('modal-confirm-delete'),
            destructive: true
        }
    ];

    //-------------------Gallery-------------------/
    const handleSave = async () => {
        try {
            // Thu thập dữ liệu từ các trạng thái
            const actionType = "create"; // Hoặc bất kỳ hành động nào bạn cần
            const formData = {
                taggedProducts: JSON.stringify(taggedProducts), // Chuyển object thành JSON string
                _action: actionType,
            }
            // Gửi dữ liệu tới server
            await fetcher.submit(formData, { method: "post" });
            shopify.loading(true)

        } catch (error) {
            console.error("Error save database:", error);
            console.log("Cannot save!");
        } finally {
            console.log();
        }
    }
    const [currentPost, setCurrentPost] = useState(null) //Lưu bài viết hiện tại để hiển thị lên modal
    const [taggedProducts, setTaggedProducts] = useState(gallerys?.taggedProducts || {}); //Lưu đối tượng chứa thông tin tag theo từng post
    const [currentIndex, setCurrentIndex] = useState(0); // Chỉ mục bài viết hiện tại
    const [checked, setChecked] = useState(false); // Check chọn tất cả bài viết
    const handleChangeCheck = useCallback(
        (newChecked) => setChecked(newChecked),
        [],
    )
    const [active, setActive] = useState(false); //Toggele bật tắt modal
    const [activePreviewModal, setActivePreviewModal] = useState(false); //Toggele bật tắt preview
    const handleTogglePreviewModal = useCallback((post) => {
        setActivePreviewModal(!activePreviewModal); // ✅ Cập nhật trạng thái đúng cách
        setCurrentPost(prevPost => (prevPost?.id === post.id ? prevPost : post)); // ✅ Chỉ cập nhật nếu khác
    }, [activePreviewModal]); // ✅ Không cần dependency để tránh re-render vô tận

    const toggleModal = useCallback(() => setActive((active) => !active), []);
    const handleChanges = useCallback((post) => {
        setActive(!active)
        setCurrentPost(prevPost => (prevPost?.id === post.id ? prevPost : post)); // ✅ Chỉ cập nhật nếu khác
    }, [active])
    //const [selectedProducts, setSelectedProducts] = useState([]); //Lưu danh sách sản phẩm được tag và vị trí tag
    const selectedProducts = useMemo(() => taggedProducts[currentPost?.id] || [], [currentPost, taggedProducts]);
    const [imageClickPosition, setImageClickPosition] = useState(null);// Lưu vị trí chọn tag
    const [cursorPosition, setCursorPosition] = useState(null); //Lưu vị trí chữ đi theo con trỏ chuột
    const [hideCursorText, setHideCursorText] = useState(false); //Lưu trạng thái hiển thị của chữ đi theo con trỏ chuột 
    const [textFieldSearchProducts, setTextFieldSearchProducts] = useState(""); //Xử lý input search sản phẩm
    const handleTextFieldSearchChange = useCallback(
        (value) => setTextFieldSearchProducts(value),
        [],
    );
    //Xử lý chiều dài của popover
    const [popoverWidths, setPopoverWidths] = useState({});
    const popoverRefs = useRef({});
    useEffect(() => {
        if (selectedProducts.length === Object.keys(popoverWidths).length) return;
        const newWidths = {};
        Object.keys(popoverRefs.current).forEach((key) => {
            if (popoverRefs.current[key]) {
                newWidths[key] = popoverRefs.current[key].offsetWidth;
            }
        });
        setPopoverWidths(newWidths);
    }, [selectedProducts]); // ✅ Loại bỏ popoverWidths khỏi dependency

    const handleImageClick = (event) => {
        const img = event.target; // Ảnh mà user click vào
        const rect = img.getBoundingClientRect();

        const x = event.clientX - rect.left; // Pixel position inside the image
        const y = event.clientY - rect.top;

        // Chuyển tọa độ pixel thành phần trăm và làm tròn đến 4 chữ số thập phân
        const xPercent = ((x / rect.width) * 100)

        const yPercent = ((y / rect.height) * 100)

        // Lưu vị trí theo phần trăm
        setImageClickPosition({ x: xPercent, y: yPercent });

        // Hiển thị modal chọn sản phẩm
        shopify.modal.show('modal-list-producst');
    };
    //Xử lý di chuyển chuột trong ảnh
    const handleMouseMove = (event) => {
        if (hideCursorText) return; // Nếu chuột đang ở dot hoặc popover, không hiển thị cursor-text
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setCursorPosition({ x, y });
    };
    //Xử lý khi rời chuột khỏi ảnh
    const handleMouseLeave = () => {
        setCursorPosition(null);
    };
    //Xử lý chọn sản phẩm trong modal
    const handleSelectProduct = (product) => {
        //setSelectedProducts([...selectedProducts, { ...product, position: imageClickPosition }]);
        if (!currentPost) return;

        setTaggedProducts((prev) => {
            const postId = currentPost.id;
            const updatedProducts = [...(prev[postId] || []), { ...product, position: imageClickPosition }];

            if (JSON.stringify(prev[postId]) === JSON.stringify(updatedProducts)) {
                return prev; // Trả về state cũ nếu không có thay đổi thực sự
            }

            return {
                ...prev,
                [postId]: updatedProducts,
            };
        });

        shopify.modal.hide('modal-list-producst')
    };
    //Xử lý hiển thị popover khi hover vào dot
    const getPopupPosition = (dotX, dotY, popWidth) => {

        const popupWidth = popWidth;  // Chiều rộng của popup
        const popupHeight = 80;  // Chiều cao của popup
        const offset = 10;       // Khoảng cách giữa dot và popup
        const imgWidth = 400;    // Chiều rộng của ảnh
        const imgHeight = 400;   // Chiều cao của ảnh
        let left = popupWidth / 2;
        let top = 2;
        let arrow = null;
        //Các vị trí cần chỉnh sửa
        //trái -> dotX < popupWidth / 2; 
        if (dotX < popupWidth / 2) {
            left = 0
            top = 2
            arrow = 1
        }
        //phải -> imgWidth - popupWidth / 2;
        if (dotX > (imgWidth - popupWidth / 2)) {
            left = popupWidth - 4
            top = 2
            arrow = popupWidth - 26
        }
        //dưới -> imgHeight - popupHeight
        if (dotY > (imgHeight - popupHeight)) { top = -80 }
        return { left, top, arrow };
    };

    //Lọc danh sách sản phẩm dựa trên từ khóa tìm kiếm
    const filteredProducts = useMemo(() => {
        const searchTerm = textFieldSearchProducts?.toLowerCase().trim();
        return productsLoader?.nodes?.filter((product) =>
            product.title.toLowerCase().includes(searchTerm)
        );
    }, [textFieldSearchProducts, productsLoader]);
    //Xử lý hover vào item
    const [hoveredProductId, setHoveredProductId] = useState(null);
    //Xử lý xóa item tag khỏi danh sách chọn
    const handleRemoveProduct = (productId) => {
        //setSelectedProducts((prevProducts) => prevProducts.filter((item) => item.id !== productId));
        if (!currentPost) return;

        setTaggedProducts((prev) => {
            const postId = currentPost.id;
            const updatedProducts = prev[postId]?.filter((item) => item.id !== productId) || [];

            return {
                ...prev,
                [postId]: updatedProducts,
            };
        });
    };
    //
    const handleNextPost = () => {
        if (currentIndex < posts.media.data.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            setCurrentPost(posts.media.data[newIndex]);
        }
    };

    const handlePreviousPost = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            setCurrentPost(posts.media.data[newIndex]);
        }
    };

    const [showOutlet, setShowOutlet] = useState(false);
    useEffect(() => {
        if (params.gallaryId) {
            setShowOutlet(true);
        } else {
            setShowOutlet(false);
        }
    }, [params.gallaryId]);

    const handleDeleteGallery = async (id) => {
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
                handleDeleteGallery(selectedResources);
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
    useEffect(() => {
        if (fetcher.data?.galleryWithWidget) {
            setGalleryToDelete(fetcher.data?.galleryWithWidget);
        }
    }, [fetcher.data, galleryToDeletes]);


    if (showOutlet) {
        return <Outlet />;
    }
    return (
        <div>
            {createView ? (
                <div>
                    <GalleryTest
                        posts={posts}
                        products={productsLoader}
                        currentPost={currentPost}
                        taggedProducts={taggedProducts}
                        handleImageClick={handleImageClick}
                        handleMouseMove={handleMouseMove}
                        handleMouseLeave={handleMouseLeave}
                        handleSelectProduct={handleSelectProduct}
                        handleRemoveProduct={handleRemoveProduct}
                        handleNextPost={handleNextPost}
                        handlePreviousPost={handlePreviousPost}
                        toggleModal={toggleModal}
                        active={active}
                        activePreviewModal={activePreviewModal}
                        handleTogglePreviewModal={handleTogglePreviewModal}
                        handleChange={handleChanges}
                        checked={checked}
                        handleChangeCheck={handleChangeCheck}
                        textFieldSearchProducts={textFieldSearchProducts}
                        handleTextFieldSearchChange={handleTextFieldSearchChange}
                        filteredProducts={filteredProducts}
                        hoveredProductId={hoveredProductId}
                        setHoveredProductId={setHoveredProductId}
                        popoverWidths={popoverWidths}
                        popoverRefs={popoverRefs}
                        getPopupPosition={getPopupPosition}
                        cursorPosition={cursorPosition}
                        hideCursorText={hideCursorText}
                        setHideCursorText={setHideCursorText}
                        handleSave={handleSave}
                        fetcher={fetcher}
                        selectedProducts={selectedProducts}
                        isAddGallery={true}
                        showError={showError}
                        handleSourceNameChange={handleSourceNameChange}
                        showErrorAccount={showErrorAccount}
                        galleryName={galleryName}
                        setGalleryName={setGalleryName}
                        selectedSources={selectedSources}
                        shopify={shopify}
                        setCreateView={setCreateView}
                        handleRemoveSource={handleRemoveSource}
                        title={"Edit gallery"}
                    />
                </div>
            ) : (

                <Page
                    title="All gallery"
                    primaryAction={<Button icon={PlusIcon} variant="primary" onClick={() => { setCreateView(true); shopify.saveBar.show('my-save-bar'); setPost([]) }}>Add new gallery</Button>}
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
                                    { title: 'From source' },
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
            )}

            <SaveBar id="my-save-bar">
                <button
                    loading={fetcher.state === "submitting" ? "true" : undefined}
                    variant="primary"
                    onClick={() => {
                        if (validataForm(galleryName, selectedSources)) {
                            handleCreateGallery();
                            setGalleryName("")
                            setSelectedSources([])
                        } else {
                            shopify.saveBar.leaveConfirmation()
                        }
                    }}
                >
                    Save source
                </button>
                <button
                    onClick={() => {
                        shopify.saveBar.hide('my-save-bar');
                        //shopify.saveBar.leaveConfirmation();
                        // navigate(`/app/gallery`);
                        // setCreateView(false)
                    }}
                >
                    Discard
                </button>
            </SaveBar>

            <Modal id="my-modal">
                <BlockStack>
                    <Box padding='400' background="bg-surface" borderRadius="100">
                        <Card>
                            <BlockStack gap='200'>

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
                                                                selected={selectedSources}
                                                                onChange={(value) => handleChange(value)}
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

                            </BlockStack>
                        </Card>
                    </Box>
                </BlockStack>
                <TitleBar title="Select media source">
                    <button
                        onClick={() => handleSelectSource(selectedSources[0])}
                        disabled={selectedSources.length === 0}
                        variant="primary"
                        loading={fetcher.state === "submitting" ? "true" : undefined}
                    >
                        Ok
                    </button>
                    <button onClick={() => shopify.modal.hide('my-modal')}>Cancel</button>
                </TitleBar>
            </Modal>

            <Modal id="modal-confirm-delete">
                <Box padding='400'>
                    <p>This can't be undone.</p>
                </Box>
                <TitleBar title="Delete selected widget(s)?">
                    <button loading={(fetcher.state === "submitting") ? ("true") : undefined} onClick={() => { handleDeleteGallery(selectedResources); }} tone="critical" variant="primary">Confirm</button>
                    <button onClick={() => { clearSelection(); shopify.modal.hide('modal-confirm-delete') }}>Cancel</button>
                </TitleBar>
            </Modal>

            <Modal id="modal-confirm-delete-sub">
                {reload ? (<InlineStack blockAlign='center' align='center'><Spinner accessibilityLabel="Spinner example" size="large" /></InlineStack>) : (
                    <Box padding='400'>
                        <div className="modal-required-delete-source">
                            <p className='modal-required-delete-source-title' style={{ marginBottom: '16px' }}>Remove the items listed below before deleting this gallery to ensure your data is accurate, consistent, and complete.</p>
                            <div className="modal-required-delete-source-list-tree">
                                {galleryToDeletes?.map((gallery, index) => (
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
                                                    <div className="label">Gallery:</div>
                                                    <div className="name">{gallery.galleyName}</div>
                                                    {gallery.widgetSettings?.length === 0 && (
                                                        <span onClick={() => handleDeleteById("gallery", gallery.id)} className="button-delete">
                                                            <Icon
                                                                source={DeleteIcon}
                                                                tone="critical"
                                                            />
                                                        </span>
                                                    )}

                                                </InlineStack>
                                            </Box>
                                            {gallery.widgetSettings?.map((widget, index) => (
                                                <ul key={index} style={{ paddingInlineStart: '10px' }}>
                                                    <li style={{ listStyle: 'none' }} className="sub-source-tree">
                                                        <span>
                                                            <img style={{ marginRight: '8px' }} src="https://widget.onecommerce.io/assets/gallery-thumb-BSZc8u2k.svg" alt="image" />
                                                        </span>
                                                        <span className="label">Widget:</span>
                                                        <span className="name"> {widget.widgetName}</span>
                                                        
                                                            <span onClick={() => handleDeleteById("widget", widget.id)} style={{ marginLeft: '8px' }} className="button-delete">
                                                                <img src="https://widget.onecommerce.io/assets/delete-icon-tqm6UhHJ.svg" alt="" />
                                                            </span>
                                                        
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
                <TitleBar title="Action required before deleting gallery">
                    <button onClick={() => { clearSelection(); shopify.modal.hide('modal-confirm-delete-sub') }}>Cancel</button>
                </TitleBar>
            </Modal>

        </div>
    );

}
