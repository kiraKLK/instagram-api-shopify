import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
    Checkbox,
    Icon,
    Modal,
    Pagination,
    Button,
    ChoiceList
} from '@shopify/polaris';
import { Modal as ModalIframe, TitleBar, useAppBridge, SaveBar } from '@shopify/app-bridge-react';
import {
    SearchIcon, DeleteIcon
} from '@shopify/polaris-icons';
import { json } from "@remix-run/node";
import styles from '../style/style-gallery.css?url'
import { useLoaderData, useFetcher, useParams } from "@remix-run/react";
import axios from 'axios';
import db from "../db.server";
import { authenticate } from "../shopify.server";
import GalleryTest from '../component/gallery';

export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request, params }) {
    const { admin, session } = await authenticate.admin(request);
    const galleryId = params.gallaryId; // Lấy giá trị từ params
    const gallerys = await db.gallery.findFirst({
        where: {
            id: parseInt(galleryId, 10) // Sử dụng giá trị từ params
        }
    });
    const sourceByGalleryId = await db.source.findFirst({
        where: {
            id: gallerys.sourceId
        }
    })
    const account = await db.account.findFirst({
        where: { id: sourceByGalleryId.accountId },
    });

    const accessToken = account?.accessToken;
    if (accessToken) {
        try {
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
            const products = data.data.products;

            const sources = await db.source.findMany({})

            return json({ posts, products, gallerys, source: sourceByGalleryId, sources });
        } catch (error) {
            console.error('Lỗi khi lấy bài viết:', error.response?.data || error.message);
            throw error;
        }
    }
    return null;
}

export const action = async ({ request, params }) => {
    try {
        // Xác thực admin và session
        const { admin, session } = await authenticate.admin(request);

        // Chuyển đổi formData thành đối tượng
        const formData = Object.fromEntries(await request.formData());
        const actionType = formData._action;
        // Lấy dữ liệu từ formData
        const galleryName = formData?.galleryName?.toString() ?? ""
        const sourceName = formData?.sourceName?.toString() ?? ""
        console.log("🚀 ~ action ~ galleryName:", galleryName)
        const taggedProducts = formData?.taggedProducts?.toString() ?? "";

        // const metafield = new admin.rest.resources.Metafield({ session });
        // //Gán namespace, key và value cho Metafield
        // metafield.namespace = "instagram";
        // metafield.key = "gallery";
        // metafield.value = JSON.stringify({
        //     taggedProducts
        // });
        // metafield.type = "json";
        // // Lưu Metafield mới
        // await metafield.save({ update: true })
        switch (actionType) {
            case "update": {
                const galleryId = params.gallaryId; // Lấy giá trị từ params
                const gallerys = await db.gallery.findFirst({
                    where: {
                        id: parseInt(galleryId, 10) // Sử dụng giá trị từ params
                    }
                });

                await db.gallery.update({
                    where: { id: gallerys.id }, // 🔹 Thay id này bằng giá trị phù hợp (ví dụ: postId, userId, ...)
                    data: {
                        taggerProducts: taggedProducts, // Cập nhật dữ liệu nếu tồn tại
                        galleyName: galleryName,
                        sourceId: gallerys.sourceId,
                    },
                });
                return json({
                    success: true,
                    message: "Update gallery successfully.",
                }, { status: 200 });
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
                return Response.json({
                    success: true,
                    message: `Select source successfully.`,
                    posts,
                    source: source.sourceName
                });
            }
            default:
                return json({ error: "Unknown action type." }, { status: 400 });
        }
    } catch (error) {
        console.error("Cannot load database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
}

export function shouldRevalidate() {
    return true;
}


export default function Source() {
    const fetcher = useFetcher()
    const shopify = useAppBridge()
    const loaderData = useLoaderData(); //Lấy data từ loader
    const params = useParams(); // Declare params to use in the component
    const [posts, setPost] = useState(loaderData?.posts || [])
    const productsLoader = loaderData?.products || [] // Data tất cả sản phẩm trong store
    const gallery = loaderData?.gallerys || {}
    const source = loaderData?.source || {}
    const sources = loaderData?.sources || []
    const [createView, setCreateView] = useState(false);
    const [currentPost, setCurrentPost] = useState(null) //Lưu bài viết hiện tại để hiển thị lên modal
    const [taggedProducts, setTaggedProducts] = useState(JSON.parse(gallery?.taggerProducts || "{}")); //Lưu đối tượng chứa thông tin tag theo từng post
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
    //Tắt loading khi rendered component
    useEffect(() => {
        shopify.loading(false)
    }, [shopify]);

    const [showError, setShowError] = useState({});
    const [galleryName, setGalleryName] = useState(gallery?.galleyName);
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
        return source.sourceName === sourceName
    }
    //Chọn account tạo source
    // State để lưu trạng thái chọn của từng tài khoản
    const [showErrorAccount, setShowErrorAccount] = useState({});
    const [selectedSources, setSelectedSources] = useState([source.sourceName]);
    // Xử lý khi thay đổi giá trị ChoiceList
    const handleChange = useCallback((value) => {
        if (value !== selectedSources) {
            setSelectedSources(value);
            if (value.length > 0) setShowErrorAccount({ error: false, message: "" });
            if (showErrorAccount.length === 0) setShowErrorAccount({ error: true, message: "Select source is required" });
        }
    }, [selectedSources, showErrorAccount]);
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
        setSelectedSources([]);
        setPost({ ...posts, media: { ...posts.media, data: [] } });
    }, [posts]);

    const handleSave = async () => {
        try {
            // Thu thập dữ liệu từ các trạng thái
            const actionType = "update"; // Hoặc bất kỳ hành động nào bạn cần
            const formData = {
                galleryName: galleryName,
                sourceName: selectedSources[0],
                taggedProducts: JSON.stringify(taggedProducts), // Chuyển object thành JSON string
                _action: actionType,
            }
            console.log("🚀 ~ handleSave ~ formData:", formData)
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
    const hasChanges = useMemo(() => {
        return (

            galleryName !== gallery?.galleyName ||
            !selectedSources.includes(source?.sourceName) ||
            JSON.stringify(taggedProducts) !== JSON.stringify(JSON.parse(gallery?.taggerProducts || "{}"))
        )

    }, [galleryName, selectedSources, taggedProducts]);

    const [unSave, setUnSave] = useState()
    useEffect(() => {
        if (hasChanges) {
            console.log("🚀 ~ hasChanges ~ galleryName:", galleryName)
            console.log("🚀 ~ hasChanges ~ gallery?.galleyName:", gallery?.galleyName)
            console.log("🚀 ~ Source ~ gallery:", gallery)
            setUnSave(true)
            shopify.saveBar.show('my-save-bar');
        } else {
            setUnSave(false)
            shopify.saveBar.hide('my-save-bar');
        }
    }, [hasChanges, shopify, taggedProducts, selectedSources, galleryName]);

    useEffect(() => {
        if (fetcher.state === "loading") {
            shopify.toast.show(fetcher.data?.message, {
                duration: 2500,
            });
            switch (fetcher.data?.message) {
                case "Select source successfully.": {
                    shopify.modal.hide('my-modal');
                    setPost(fetcher.data?.posts);
                    setSelectedSources(fetcher.data?.source);
                    break;
                }
                case "Update gallery successfully.": {
                    shopify.saveBar.hide('my-save-bar')
                }
                default:
                    break;
            }
            shopify.loading(false); // tắt loading
        }
    }, [fetcher.data?.message, fetcher.state, shopify, params.gallaryId]);
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
        return productsLoader.nodes.filter((product) =>
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

    return (
        <>
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
                isAddGallery={false}
                showError={showError}
                handleSourceNameChange={handleSourceNameChange}
                galleryName={galleryName}
                setGalleryName={setGalleryName}
                selectedSources={selectedSources}
                shopify={shopify}
                showErrorAccount={showErrorAccount}
                handleRemoveSource={handleRemoveSource}
                setCreateView={setCreateView}
                hasChanges={unSave}
            />
            <SaveBar id="my-save-bar">
                <button
                    // loading={fetcher.state === "submitting" ? "true" : undefined}
                    loading={fetcher.state === "submitting" ? "true" : false}
                    variant="primary"
                    onClick={(e) => {
                        if (validataForm(galleryName, selectedSources)) {
                            handleSave();
                            setUnSave(false)
                        }
                        else {
                            shopify.saveBar.leaveConfirmation()
                            e.preventDefault()
                        }
                    }}
                >
                    Save source
                </button>
                <button
                    onClick={() => {
                        shopify.saveBar.hide('my-save-bar');
                        setUnSave(false)
                    }}
                >
                    Discard
                </button>
            </SaveBar>
            <ModalIframe onHide={() => setSelectedSources([])} id="my-modal">
                <BlockStack>
                    <Box padding='400' background="bg-surface" borderRadius="100">
                        <Card>
                            <BlockStack gap='200'>

                                <BlockStack gap='200'>
                                    <Text variant="bodyMd" as="p">
                                        Select source
                                    </Text>
                                    {sources.length > 0 ?
                                        (
                                            <InlineGrid gap='100' columns={2}>
                                                {sources.map((ga, index) => (
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
                        onClick={() => { handleSelectSource(selectedSources[0]); shopify.modal.hide('my-modal') }}
                        disabled={selectedSources.length === 0}
                        variant="primary"
                        loading={fetcher.state === "submitting" ? "true" : undefined}
                    >
                        Ok
                    </button>
                    <button onClick={() => shopify.modal.hide('my-modal')}>Cancel</button>
                </TitleBar>
            </ModalIframe>
        </>
    )
}


