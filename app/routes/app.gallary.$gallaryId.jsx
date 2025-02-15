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
    Button
} from '@shopify/polaris';
import { Modal as ModalIframe, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import {
    SearchIcon, DeleteIcon
} from '@shopify/polaris-icons';
import { json } from "@remix-run/node";
import styles from '../style/style-gallery.css?url'
import { useLoaderData, useFetcher } from "@remix-run/react";
import axios from 'axios';
import db from "../db.server";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }) {
    const { admin, session } = await authenticate.admin(request);
    const widget = await db.account.findFirst({
        where: { sessionId: session.id },
    })
    const accessToken = widget?.accessToken
    const gallery = await db.gallery.findFirst({
        where: {
            id: 1
        }
    })
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
            const products = data.data.products

            return json({ posts, products, gallery: gallery.taggerProducts });
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
        const taggedProducts = JSON.parse(formData?.taggedProducts || "{}");
        console.log('taggedProducts: ', taggedProducts);
        if (actionType === "create") {

            const metafield = new admin.rest.resources.Metafield({ session });
            //Gán namespace, key và value cho Metafield
            metafield.namespace = "instagram";
            metafield.key = "gallery";
            metafield.value = JSON.stringify({
                taggedProducts
            });
            metafield.type = "json";
            // Lưu Metafield mới
            await metafield.save({ update: true })
            console.log("Metafield save successfull!", metafield)

            const existingGallery = await db.gallery.upsert({
                where: { id: 1 }, // 🔹 Thay id này bằng giá trị phù hợp (ví dụ: postId, userId, ...)
                update: {
                    taggerProducts: JSON.stringify({
                        taggedProducts
                    }), // Cập nhật dữ liệu nếu tồn tại
                },
                create: {
                    taggerProducts: JSON.stringify({
                        taggedProducts
                    }), // Tạo mới nếu không tồn tại
                    accountId: 10, // 🔹 Giá trị này cần thay đổi theo dữ liệu thực tế
                },
            });
            return json({
                success: true,
                message: "Create gallery successfully.",
            }, { status: 200 });

        } else {
            return json({ error: "Unknown action type." }, { status: 400 });
        }
    } catch (error) {
        console.error("Cannot load database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
}

export default function Source() {
    const shopify = useAppBridge()
    //Tắt loading khi rendered component
    useEffect(() => {
        shopify.loading(false)
    }, [shopify]);
    const fetcher = useFetcher()
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
            console.log("Save successfull", formData);
        } catch (error) {
            console.error("Error save database:", error);
            console.log("Cannot save!");
        } finally {
            console.log();
        }
    }
    useEffect(() => {
        if (fetcher.state === "loading") {
            // Hiển thị toast khi lưu và load dữ liệu thành công
            shopify.toast.show(fetcher.data?.message, {
                duration: 1500,
            })
            // Ẩn save bar
            shopify.loading(false) // tắt loading
        }
    }, [fetcher.data?.message, fetcher.state, shopify]);

    const loaderData = useLoaderData(); //Lấy data từ loader
    const posts = loaderData?.posts || [] // Data bài viết instagram
    const productsLoader = loaderData?.products || [] // Data tất cả sản phẩm trong store
    const gallery = JSON.parse(loaderData?.gallery) || {}
    const [currentPost, setCurrentPost] = useState(null) //Lưu bài viết hiện tại để hiển thị lên modal
    const [taggedProducts, setTaggedProducts] = useState(gallery?.taggedProducts || {}); //Lưu đối tượng chứa thông tin tag theo từng post
    console.log('taggedProducts: ', taggedProducts);
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
    const handleChange = useCallback((post) => {
        setActive(!active)
        setCurrentPost(prevPost => (prevPost?.id === post.id ? prevPost : post)); // ✅ Chỉ cập nhật nếu khác
    }, [active])
    //const [selectedProducts, setSelectedProducts] = useState([]); //Lưu danh sách sản phẩm được tag và vị trí tag
    const selectedProducts = useMemo(() => taggedProducts[currentPost?.id] || [], [currentPost, taggedProducts]);
    console.log('selectedProducts: ', selectedProducts);
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

    //Xử lý khi nhấn chọn vị trí trong ảnh
    // const handleImageClick = (event) => {

    //     const rect = event.target.getBoundingClientRect();
    //     const x = event.clientX - rect.left;
    //     const y = event.clientY - rect.top;

    //     setImageClickPosition({ x, y });
    //     shopify.modal.show('modal-list-producst')
    // };
    const handleImageClick = (event) => {
        const img = event.target; // Ảnh mà user click vào
        const rect = img.getBoundingClientRect();

        const x = event.clientX - rect.left; // Pixel position inside the image
        const y = event.clientY - rect.top;

        // Chuyển tọa độ pixel thành phần trăm và làm tròn đến 4 chữ số thập phân
        const xPercent = ((x / rect.width) * 100)
        console.log('xPercent: ', xPercent);
        const yPercent = ((y / rect.height) * 100)
        console.log('yPercent: ', yPercent);

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
                            {/**Code ở đây */}
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
                                    {posts?.media?.data.map((post, index) => {
                                        const taggedCount = taggedProducts[post.id]?.length || 0; // Số lượng sản phẩm đã tag
                                        return (
                                            <div
                                                key={index}
                                                onClick={(e) => {
                                                    handleTogglePreviewModal(post);
                                                    e.stopPropagation();
                                                }}
                                                style={{ backgroundImage: `url(${post.media_url})` }}
                                                className="list-media-source-item"
                                            >
                                                <div className="list-media-source-item-tag">
                                                    <Button onClick={(e) => { handleChange(post); e.stopPropagation(); }}>Tag product ({taggedCount})</Button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>
                            </Scrollable>
                        </Card>
                    </InlineGrid>
                </div>
            </Page>

            <Modal
                size="large"
                open={active}
                onClose={handleChange}
                title="Tag products"
                primaryAction={{
                    content: 'Confirm',
                    onAction: handleSave,
                    loading: fetcher.state === "submitting"
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: toggleModal,
                    },
                ]}
            >
                <div className="modal-tag">
                    <div className="modal-tag-content">
                        <div
                            className="modal-tag-content-image"
                            onClick={handleImageClick}
                        // onMouseMove={handleMouseMove}
                        // onMouseLeave={handleMouseLeave}
                        >
                            <img className='modal-tag-content-image-img' src={currentPost?.media_url} alt="" />
                            {/* {cursorPosition && !hideCursorText && (
                                <div
                                    className="cursor-text"
                                    style={{
                                        position: "absolute",
                                        top: `${cursorPosition.y - 15}px`,
                                        left: `${cursorPosition.x}px`,
                                        transform: "translate(-50%, -100%)",
                                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                                        color: "white",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        whiteSpace: "nowrap",
                                        pointerEvents: "none",
                                    }}
                                >
                                    Click to tag a product
                                </div>
                            )} */}
                            {selectedProducts.map((item, index) => {
                                const popoverWidth = popoverWidths[index] || 0; // Lấy width từ state

                                const { left, top, arrow } = getPopupPosition(item.position.x, item.position.y, popoverWidth);
                                const arrowStyle = top !== -80
                                    ? { top: "-7px", borderBottom: "14px solid var(--sw-hotspot-hover-color, rgb(37, 38, 39))", left: `${arrow}px` }
                                    : { bottom: "-7px", borderTop: "14px solid var(--sw-hotspot-hover-color, rgb(37, 38, 39))", left: `${arrow}px` };
                                return (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation(); // Ngăn sự kiện click từ bubble lên dòng
                                        }}
                                        // onMouseEnter={() => setHideCursorText(true)}
                                        // onMouseLeave={() => setHideCursorText(false)}
                                        key={index}
                                        className="dot"
                                        style={{
                                            position: "absolute",
                                            top: `${item.position.y}%`,
                                            left: `${item.position.x}%`,
                                            width: "10px",
                                            height: "10px",
                                            backgroundColor: "red",
                                            borderRadius: "50%",
                                            transform: "translate(-50%, -50%)",
                                          
                                        }}
                                    >
                                        <div
                                            ref={(el) => (popoverRefs.current[index] = el)} // Lưu ref của từng popover
                                            // onMouseEnter={() => setHideCursorText(true)}
                                            // onMouseLeave={() => setHideCursorText(false)}
                                            className={`hotspot-popover ${hoveredProductId === item.id ? "visible" : ""}`}
                                            style={{ marginLeft: `-${left}px`, marginTop: `${top}px` }}
                                        >
                                            <div className="hotspot-popover-arrow" style={arrowStyle} ></div>
                                            <div className="hotspot-popover-content">
                                                <div style={{ whiteSpace: 'nowrap' }}>{item.title}</div>
                                                <div style={{ whiteSpace: 'nowrap' }}>{item.variants.edges[0].node.price}đ</div>
                                            </div>
                                            <div className="hotspot-popover-redirect">
                                                <svg width="4" height="7" viewBox="0 0 4 7" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.64062 3.71094C3.75781 3.59375 3.75781 3.42969 3.66406 3.3125L0.898438 0.59375C0.78125 0.476562 0.59375 0.476562 0.5 0.59375L0.335938 0.757812C0.21875 0.875 0.21875 1.03906 0.335938 1.15625L2.72656 3.5L0.335938 5.86719C0.21875 5.98438 0.21875 6.14844 0.335938 6.26562L0.5 6.42969C0.59375 6.54688 0.78125 6.54688 0.898438 6.42969L3.64062 3.71094Z" fill="white"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="modal-tag-content-wrapper">
                            <div className="modal-tag-content-wrapper-header">
                                <div style={{ backgroundImage: `url(${posts.profile_picture_url})` }} className="modal-tag-content-wrapper-header-avatar">
                                </div>
                                <div className="modal-tag-content-wrapper-header-username">{posts.username}</div>
                            </div>
                            <div className="modal-tag-content-wrapper-products">
                                {selectedProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="modal-tag-content-wrapper-products-item"
                                        onMouseEnter={() => setHoveredProductId(product.id)}
                                        onMouseLeave={() => setHoveredProductId(null)}
                                    >
                                        <InlineStack align='center' blockAlign='center' >
                                            <InlineStack>
                                                <img src={product.images.edges[0]?.node?.src} className="modal-tag-content-wrapper-product-image" alt='' />
                                                <div style={{ width: "300px" }}>
                                                    <BlockStack align='center'>
                                                        <div>{product.title}</div>
                                                        <div>{product.variants.edges[0].node.price}đ</div>
                                                    </BlockStack>
                                                </div>
                                            </InlineStack>
                                            <Button onClick={() => handleRemoveProduct(product.id)} icon={DeleteIcon} accessibilityLabel="Delete item" variant="tertiary" />
                                        </InlineStack>
                                    </div>
                                ))}
                                {selectedProducts.length === 0 && (
                                    <p style={{ textAlign: "center", marginTop: "10px", color: "gray" }}>
                                        *Note: Click anywhere in the image on the left to tag a product
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-tag-pagination">
                        <Pagination
                            hasPrevious
                            previousKeys={[74]}
                            onPrevious={
                                handlePreviousPost
                            }
                            hasNext
                            nextKeys={[75]}
                            onNext={handleNextPost}
                        />
                        <div className="modal-tag-pagination-left"></div>
                        <div className="modal-tag-pagination-right"></div>
                    </div>
                </div>
            </Modal>

            <ModalIframe id='modal-list-producst' variant='small'>
                <TitleBar title="Tag products">
                </TitleBar>
                <Box padding="400">
                    <TextField
                        value={textFieldSearchProducts}
                        onChange={handleTextFieldSearchChange}
                        prefix={<Icon source={SearchIcon} tone="base" />}
                        autoComplete='off'
                        autoFocus
                        placeholder='search product'
                    />

                    <Scrollable shadow style={{ height: '220px', marginBlockStart: '8px' }} focusable>
                        <BlockStack gap="300">
                            {filteredProducts.map((product) => {
                                // Kiểm tra xem sản phẩm đã được chọn chưa
                                const isSelected = selectedProducts.some((item) => item.id === product.id);

                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => !isSelected && handleSelectProduct(product)} // Chỉ chọn nếu chưa được chọn
                                        className={`products-list ${isSelected ? "disabled" : ""}`} // Thêm class nếu đã chọn
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            cursor: isSelected ? "not-allowed" : "pointer", // Đổi con trỏ chuột
                                            opacity: isSelected ? 0.5 : 1, // Làm mờ sản phẩm đã chọn
                                            pointerEvents: isSelected ? "none" : "auto", // Ngăn click vào sản phẩm đã chọn
                                        }}
                                    >
                                        <img
                                            src={product.images.edges[0]?.node?.src}
                                            alt=""
                                            style={{ width: "40px", height: "40px", borderRadius: "4px", objectFit: "cover" }}
                                        />
                                        <span
                                            style={{
                                                overflow: "hidden",
                                                whiteSpace: "nowrap",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {product.title}
                                        </span>
                                    </div>
                                );
                            })}


                            {/* Hiển thị thông báo nếu không tìm thấy sản phẩm */}
                            {filteredProducts.length === 0 && (
                                <p style={{ textAlign: "center", marginTop: "10px", color: "gray" }}>
                                    No products found
                                </p>
                            )}
                        </BlockStack>
                    </Scrollable>
                </Box>
            </ModalIframe>

            <Modal
                size="large"
                open={activePreviewModal}
                onClose={handleTogglePreviewModal}
            >
                <div className='modal'>
                    <div className='modal-left'>
                        <div style={{position:'relative',height:'fit-content',maxHeight:'100%',display:'flex'}}>
                            <img className='modal-left-media' src={currentPost?.media_url} alt="" />
                            {selectedProducts.map((item, index) => {
                                const popoverWidth = popoverWidths[index] || 0; // Lấy width từ state

                                const { left, top, arrow } = getPopupPosition(item.position.x, item.position.y, popoverWidth);
                                const arrowStyle = top !== -80
                                    ? { top: "-7px", borderBottom: "14px solid var(--sw-hotspot-hover-color, rgb(37, 38, 39))", left: `${arrow}px` }
                                    : { bottom: "-7px", borderTop: "14px solid var(--sw-hotspot-hover-color, rgb(37, 38, 39))", left: `${arrow}px` };
                                return (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation(); // Ngăn sự kiện click từ bubble lên dòng
                                        }}
                                        // onMouseEnter={() => setHideCursorText(true)}
                                        // onMouseLeave={() => setHideCursorText(false)}
                                        key={index}
                                        className="dot"
                                        style={{
                                            position: "absolute",
                                            top: `${item.position.y}%`,
                                            left: `${item.position.x}%`,
                                            width: "10px",
                                            height: "10px",
                                            backgroundColor: "red",
                                            borderRadius: "50%",
                                            transform: "translate(-50%, -50%)",
                                        }}
                                    >
                                        <div
                                            ref={(el) => (popoverRefs.current[index] = el)} // Lưu ref của từng popover
                                            // onMouseEnter={() => setHideCursorText(true)}
                                            // onMouseLeave={() => setHideCursorText(false)}
                                            className={`hotspot-popover ${hoveredProductId === item.id ? "visible" : ""}`}
                                            style={{ marginLeft: `-${left}px`, marginTop: `${top}px` }}
                                        >
                                            <div className="hotspot-popover-arrow" style={arrowStyle} ></div>
                                            <div className="hotspot-popover-content">
                                                <div style={{ whiteSpace: 'nowrap' }}>{item.title}</div>
                                                <div style={{ whiteSpace: 'nowrap' }}>{item.variants.edges[0].node.price}đ</div>
                                            </div>
                                            <div className="hotspot-popover-redirect">
                                                <svg width="4" height="7" viewBox="0 0 4 7" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.64062 3.71094C3.75781 3.59375 3.75781 3.42969 3.66406 3.3125L0.898438 0.59375C0.78125 0.476562 0.59375 0.476562 0.5 0.59375L0.335938 0.757812C0.21875 0.875 0.21875 1.03906 0.335938 1.15625L2.72656 3.5L0.335938 5.86719C0.21875 5.98438 0.21875 6.14844 0.335938 6.26562L0.5 6.42969C0.59375 6.54688 0.78125 6.54688 0.898438 6.42969L3.64062 3.71094Z" fill="white"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                    </div>
                    <div className="modal-right">
                        <div className="modal-right-infor">
                            <BlockStack >
                                <div className="modal-right-infor-header">
                                    <InlineStack gap="400" wrap={false} blockAlign="center">
                                        <div style={{ backgroundImage: `url(${posts?.profile_picture_url})` }} className="modal-right-infor-header-avatar">
                                        </div>
                                        <div className="modal-right-infor-header-name">{posts?.username}</div>
                                    </InlineStack>
                                </div>
                                <div className="modal-right-infor-content">
                                    <div className="modal-right-infor-content-total-reaction">
                                        <Box padding="400" >
                                            <InlineStack align='center' gap="600" wrap={false} blockAlign="center">
                                                <BlockStack inlineAlign='center'>
                                                    <Text fontWeight="medium" as="p">
                                                        {currentPost?.like_count}
                                                    </Text>
                                                    <Text tone='subdued' as="p">
                                                        Like
                                                    </Text>
                                                </BlockStack>
                                                <BlockStack inlineAlign='center'>
                                                    <Text fontWeight="medium" as="p">
                                                        {currentPost?.comments_count}
                                                    </Text>
                                                    <Text tone='subdued' as="p">
                                                        Comment
                                                    </Text>
                                                </BlockStack>
                                            </InlineStack>
                                        </Box>
                                    </div>
                                    <Scrollable style={{ height: "calc(-260px + 100vh)" }} >
                                        <div>{currentPost?.caption}</div>
                                        <div className="popup-detail-shoppable-grid">
                                            {selectedProducts.map((product, index) => (
                                                <div
                                                    key={index}
                                                    className="popup-detail-shoppable-item"
                                                    onMouseEnter={() => setHoveredProductId(product.id)}
                                                    onMouseLeave={() => setHoveredProductId(null)}
                                                >
                                                    <img src={product.images.edges[0]?.node?.src} alt="123" />
                                                    <div className="popup-detail-shoppable-item-detail">
                                                        <div className="popup-detail-shoppable-item-detail-title">{product.title}</div>
                                                        <div className="popup-detail-shoppable-item-detail-price">{product.variants.edges[0].node.price}đ</div>
                                                        <div className="popup-detail-shoppable-item-detail-action">VIEW DETAIL</div>
                                                    </div>
                                                </div>
                                            ))}

                                        </div>
                                    </Scrollable>

                                </div>
                                <div className="modal-right-infor-footer">

                                </div>
                            </BlockStack>
                        </div>
                    </div>
                </div>
            </Modal>


        </>
    )
}


