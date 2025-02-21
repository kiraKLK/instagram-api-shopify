
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
    InlineError,
    EmptyState,

} from '@shopify/polaris';
import { Modal as ModalIframe, TitleBar } from '@shopify/app-bridge-react';
import {
    SearchIcon, DeleteIcon, PlusIcon, LogoInstagramIcon,
} from '@shopify/polaris-icons';
import styles from '../style/style-gallery.css?url'
export const links = () => [{ rel: "stylesheet", href: styles }];

export default function GalleryTest({
    posts,
    productsLoader,
    currentPost,
    taggedProducts,
    handleImageClick,
    handleMouseMove,
    handleMouseLeave,
    handleSelectProduct,
    handleRemoveProduct,
    handleNextPost,
    handlePreviousPost,
    toggleModal,
    active,
    activePreviewModal,
    handleTogglePreviewModal,
    handleChange,
    checked,
    handleChangeCheck,
    textFieldSearchProducts,
    handleTextFieldSearchChange,
    filteredProducts,
    hoveredProductId,
    setHoveredProductId,
    popoverWidths,
    popoverRefs,
    getPopupPosition,
    cursorPosition,
    hideCursorText,
    setHideCursorText,
    handleSave,
    fetcher,
    selectedProducts,
    isAddGallery,
    showError,
    handleSourceNameChange,
    showErrorAccount,
    galleryName,
    setGalleryName,
    selectedSources,
    shopify,
    setCreateView,
    handleRemoveSource,
    hasChanges,
    title
    
}) {

    return (
        <>
            <Page
                backAction={{
                    content: 'Products',
                    url: '/app/gallery',
                    onAction: (e) => {
                        if (hasChanges) {
                            e.preventDefault();
                            shopify.saveBar.leaveConfirmation();
                        }
                        else {
                            setCreateView(false);
                            shopify.saveBar.hide('my-save-bar');
                        }
                    }
                }}
                title={isAddGallery ? "Add new gallery" : "Edit gallery"}
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
                            {isAddGallery ? (
                                <div>
                                    <Box padding={400}>
                                        <BlockStack gap={400}>
                                            <TextField
                                                label="Name this gallery"
                                                error={showError.error && showError.message}
                                                value={galleryName}
                                                onChange={handleSourceNameChange}
                                                placeholder="Please enter..."
                                                autoComplete="off"
                                            />
                                            <InlineStack align="space-between">
                                                <Text variant="bodyMd" as="h6">Select media source(s)</Text>
                                                <Text variant="bodyMd" as="h6">0/1</Text>
                                            </InlineStack>
                                            {posts?.media?.data.length > 0 ? (
                                                <Box padding="300" borderColor='border' borderWidth="025" borderRadius="300">
                                                    <InlineStack align='space-between' blockAlign='center'>
                                                        <InlineStack gap={200} blockAlign='center'>
                                                            <div className="instagram-icon">
                                                                <Icon source={LogoInstagramIcon} />
                                                            </div>
                                                            <BlockStack>
                                                                <div className="source-name">{selectedSources[0]}</div>
                                                                <div className="items-count">{posts?.media?.data.length} items</div>
                                                            </BlockStack>
                                                        </InlineStack>
                                                        <div onClick={() => {
                                                            handleRemoveSource(); console.log("click in icon");
                                                        }} className="icon-delete" style={{ cursor: 'pointer' }}>
                                                            <Icon tone="critical" source={DeleteIcon} />
                                                        </div>
                                                    </InlineStack>
                                                </Box>
                                            ) : (
                                                <Button onClick={() => shopify.modal.show('my-modal')} icon={PlusIcon}>Select media source</Button>
                                            )}
                                            {showErrorAccount.error && <InlineError message={showErrorAccount.message} />}
                                        </BlockStack>
                                    </Box>
                                </div>
                            ) : (
                                <div>
                                    <Box padding={400}>
                                        <BlockStack gap={400}>
                                            <TextField
                                                label="Name this gallery"
                                                error={showError.error && showError.message}
                                                value={galleryName}
                                                onChange={handleSourceNameChange}
                                                placeholder="Please enter..."
                                                autoComplete="off"
                                            />
                                            <InlineStack align="space-between">
                                                <Text variant="bodyMd" as="h6">Select media source(s)</Text>
                                                <Text variant="bodyMd" as="h6">0/1</Text>
                                            </InlineStack>
                                            {posts?.media?.data.length > 0 ? (
                                                <Box padding="300" borderColor='border' borderWidth="025" borderRadius="300">
                                                    <InlineStack align='space-between' blockAlign='center'>
                                                        <InlineStack gap={200} blockAlign='center'>
                                                            <div className="instagram-icon">
                                                                <Icon source={LogoInstagramIcon} />
                                                            </div>
                                                            <BlockStack>
                                                                <div className="source-name">{selectedSources[0]}</div>
                                                                <div className="items-count">{posts?.media?.data.length} items</div>
                                                            </BlockStack>
                                                        </InlineStack>
                                                        <div onClick={() => {
                                                            handleRemoveSource(); console.log("click in icon");
                                                        }} className="icon-delete" style={{ cursor: 'pointer' }}>
                                                            <Icon tone="critical" source={DeleteIcon} />
                                                        </div>
                                                    </InlineStack>
                                                </Box>
                                            ) : (
                                                <Button onClick={() => shopify.modal.show('my-modal')} icon={PlusIcon}>Select media source</Button>
                                            )}
                                            {showErrorAccount.error && <InlineError message={showErrorAccount.message} />}
                                        </BlockStack>
                                    </Box>
                                </div>
                            )}

                        </Card>

                        <Card padding="0">
                            <Box padding="400">
                                <Text variant="headingLg" as="h5">
                                    Preview gallery
                                </Text>
                            </Box>
                            <Divider borderColor="border" />

                            <Scrollable style={{ height: 'calc(-220px + 100vh)' }}>
                                {posts?.media?.data.length > 0 ? (
                                    <div className="list-media-source">
                                        {posts?.media?.data?.map((post, index) => {
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
                                ) : (
                                    <EmptyState
                                        heading="There are no items to show"
                                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                    >
                                        <p>Please try another source</p>
                                    </EmptyState>
                                )}
                            </Scrollable>
                        </Card>
                    </InlineGrid>
                </div>
            </Page >

            <Modal
                size="large"
                open={active}
                onClose={handleChange}
                title="Tag products"
                primaryAction={{
                    content: 'Confirm',
                    onAction: toggleModal,
                    // loading: fetcher?.state === "submitting"
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
                            {selectedProducts?.map((item, index) => {
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
                                <div style={{ backgroundImage: `url(${posts?.profile_picture_url})` }} className="modal-tag-content-wrapper-header-avatar">
                                </div>
                                <div className="modal-tag-content-wrapper-header-username">{posts?.username}</div>
                            </div>
                            <div className="modal-tag-content-wrapper-products">
                                {selectedProducts?.map((product) => (
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
                                {selectedProducts?.length === 0 && (
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
                            {filteredProducts?.map((product) => {
                                // Kiểm tra xem sản phẩm đã được chọn chưa
                                const isSelected = selectedProducts?.some((item) => item.id === product.id);

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
                            {filteredProducts?.length === 0 && (
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
                        <div style={{ position: 'relative', height: 'fit-content', maxHeight: '100%', display: 'flex' }}>
                            <img className='modal-left-media' src={currentPost?.media_url} alt="" />
                            {selectedProducts?.map((item, index) => {
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
                                            {selectedProducts?.map((product, index) => (
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


