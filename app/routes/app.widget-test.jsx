/* eslint-disable no-loop-func */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    LegacyCard,
    Tabs,
    IndexTable,
    useIndexResourceState,
    Text,
    Badge,
    Page,
    Button,
    Popover,
    ActionList,
    InlineStack,
    Box,
    Icon,
    TextField,
    Select,
    Scrollable,
    Divider,
    RangeSlider,
    ChoiceList,
    ColorPicker,
    AppProvider,
    Checkbox
} from "@shopify/polaris";

// import { accessTokenCookie } from "../createCookie";
import { MenuVerticalIcon, ChevronRightIcon, XIcon, CheckSmallIcon, DesktopIcon, MobileIcon, PlusIcon, EditIcon, ProfileIcon } from "@shopify/polaris-icons";
import { Modal, TitleBar, useAppBridge, SaveBar } from '@shopify/app-bridge-react';
import styles from '../style/style-widget.css?url'
import axios from 'axios';
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams, useFetcher } from "@remix-run/react";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import Switch from "../component/switch"



export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }) {

    const { admin, session } = await authenticate.admin(request);

    // Tìm tài khoản
    const account = await db.account.findFirst({
        where: { sessionId: session.id },
    });
    const accessToken = account?.accessToken
    const accountName = account?.accountName

    const widget = await db.widgetSetting.findMany({

    })
    const gallerys = await db.gallery.findMany({})

    if (accessToken) {
        try {
            const response = await axios.get('https://graph.instagram.com/me', {
                params: {
                    fields: 'profile_picture_url,username,media{caption,media_type,media_url,comments_count,like_count,timestamp}',
                    access_token: accessToken
                }
            });

            const posts = response?.data;
            return json({ posts, accountName, widget, gallerys });

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
        const widgetId = formData?.widgetId && !isNaN(parseInt(formData.widgetId, 10))
            ? parseInt(formData.widgetId, 10)
            : 0;
        const widgetName = formData?.widgetName?.toString() ?? "";
        const gallary = formData?.gallary?.toString() ?? "";
        const hotSpotColor = formData?.hotspotColor?.toString() ?? "";
        const hotSpotHoverColor = formData?.hotspotHoverColor?.toString() ?? "";
        const widgetTemplate = formData?.widgetTemplate?.toString() ?? "";
        const numberOfColumns = parseInt(formData?.numberOfColumns?.toString() ?? "1", 10);
        const numberOfRows = parseInt(formData?.numberOfRows?.toString() ?? "1", 10);
        const borderImg = parseInt(formData?.borderImg?.toString() ?? "1", 10);
        const paddingImg = parseInt(formData?.paddingImg?.toString() ?? "0", 10);
        const widgetLayout = parseInt(formData?.widgetLayout?.toString() ?? "1", 10);
        const widgetIds = formData?.ids?.split(',').map(Number);
        const heading = {
            selectedHeadingSetting: formData?.selectedHeadingSetting?.toString() ?? "",
            switchChoiceHeadingDesc: formData?.switchChoiceHeadingDesc === "true",
            switchChoiceHeadingTitle: formData?.switchChoiceHeadingTitle === "true"
        };
        console.log("🚀 ~ action ~ heading:", heading)



        // Tìm metafield đã tồn tại
        const metafields = await admin.rest.resources.Metafield.all({
            session,
            namespace: "custom",
            key: "account_data"
        });

        let currentSettings = { accounts: [] };
        if (metafields.data.length > 0) {
            currentSettings = JSON.parse(metafields.data[0].value);
        }

        if (actionType === "create") {
            //Kiểm tra nếu tồn tại Id thì update nếu không thì tạo mới
            const existingSetting = await db.widgetSetting.findFirst({ where: { id: widgetId } });
            if (existingSetting) {
                const updatedSetting = {
                    widgetName: widgetName,
                    gallary: gallary,
                    widgetTemplate: widgetTemplate,
                    numberOfColumns: numberOfColumns,
                    numberOfRows: numberOfRows,
                    paddingImg: paddingImg,
                    borderImg: borderImg,
                    widgetLayout: widgetLayout,
                    hotSpotHoverColor: hotSpotHoverColor,
                    hotSpotColor: hotSpotColor,
                    heading: JSON.stringify(heading),
                };

                // Tìm và cập nhật setting trong currentSettings
                for (let acc of currentSettings.accounts) {
                    for (let src of acc.sources) {
                        for (let gal of src.galleries) {
                            const indexToUpdate = gal.widgetSettings.findIndex(setting => setting.id === widgetId);
                            if (indexToUpdate !== -1) {
                                gal.widgetSettings[indexToUpdate] = { ...gal.widgetSettings[indexToUpdate], ...updatedSetting };
                                break;
                            }
                        }
                    }
                }

                const newMetafield = new admin.rest.resources.Metafield({ session });
                newMetafield.namespace = "custom";
                newMetafield.key = "account_data";
                newMetafield.value = JSON.stringify(currentSettings);
                newMetafield.type = "json";

                await newMetafield.save({ update: true });

                await db.widgetSetting.update({
                    where: { id: widgetId },
                    data: updatedSetting
                });

                return json({
                    success: true,
                    message: "Widget updated successfully."
                }, { status: 200 });
            } else {
                const gallery = await db.gallery.findFirst({ where: { galleyName: gallary } });
                const source = await db.source.findFirst({ where: { id: gallery.sourceId } });
                const account = await db.account.findFirst({ where: { id: source.accountId } });

                const createdWidget = await db.widgetSetting.create({
                    data: {
                        widgetName: widgetName,
                        gallary: gallary,
                        widgetTemplate: widgetTemplate,
                        numberOfColumns: numberOfColumns,
                        numberOfRows: numberOfRows,
                        paddingImg: paddingImg,
                        borderImg: borderImg,
                        widgetLayout: widgetLayout,
                        galleryId: gallery.id,
                        hotSpotHoverColor: hotSpotHoverColor,
                        hotSpotColor: hotSpotColor,
                        heading: JSON.stringify(heading),
                    }
                });

                const newSetting = {
                    id: createdWidget.id,
                    widgetName: widgetName,
                    gallery: gallary,
                    widgetTemplate: widgetTemplate,
                    numberOfColumns: numberOfColumns,
                    numberOfRows: numberOfRows,
                    paddingImg: paddingImg,
                    borderImg: borderImg,
                    widgetLayout: widgetLayout,
                    galleryId: gallery.id,
                    hotSpotHoverColor: hotSpotHoverColor,
                    hotSpotColor: hotSpotColor,
                    heading: JSON.stringify(heading),
                };

                // Tìm account trong currentSettings
                let accountIndex = currentSettings.accounts?.findIndex(acc => acc.id === account.id);
                if (accountIndex === -1) {
                    // Nếu account chưa tồn tại, thêm mới
                    currentSettings.accounts.push({
                        id: account?.id,
                        accessToken: account?.accessToken,
                        accountName: account?.accountName,
                        sources: []
                    });
                    accountIndex = currentSettings.accounts.length - 1;
                }

                // Tìm source trong account
                let sourceIndex = currentSettings.accounts[accountIndex].sources?.findIndex(src => src.id === source.id);
                if (sourceIndex === -1) {
                    // Nếu source chưa tồn tại, thêm mới
                    currentSettings.accounts[accountIndex].sources.push({
                        id: source?.id,
                        sourceName: source?.sourceName,
                        items: source?.items,
                        accountId: source?.accountId,
                        galleries: []
                    });
                    sourceIndex = currentSettings.accounts[accountIndex].sources.length - 1;
                }

                // Tìm gallery trong source
                let galleryIndex = currentSettings.accounts[accountIndex].sources[sourceIndex].galleries?.findIndex(gal => gal.id === gallery.id);
                if (galleryIndex === -1) {
                    // Nếu gallery chưa tồn tại, thêm mới
                    currentSettings.accounts[accountIndex].sources[sourceIndex].galleries.push({
                        id: gallery?.id,
                        galleryName: gallery?.galleyName,
                        taggerProducts: gallery?.taggerProducts,
                        sourceId: gallery?.sourceId,
                        widgetSettings: []
                    });
                    galleryIndex = currentSettings.accounts[accountIndex].sources[sourceIndex].galleries.length - 1;
                }

                currentSettings.accounts[accountIndex].sources[sourceIndex].galleries[galleryIndex].widgetSettings.push(newSetting);

                const newMetafield = new admin.rest.resources.Metafield({ session });
                newMetafield.namespace = "custom";
                newMetafield.key = "account_data";
                newMetafield.value = JSON.stringify(currentSettings);
                newMetafield.type = "json";

                await newMetafield.save({ update: metafields.length > 0 });

                return json({
                    success: true,
                    message: "Widget created successfully."
                }, { status: 201 });
            }
        } else if (actionType === "delete") {
            const widgetsToDelete = await db.widgetSetting.findMany({
                where: { id: { in: widgetIds } },
                select: { id: true }
            });

            const idsToDelete = widgetsToDelete.map(widget => widget.id);

            // Xóa widgetSetting khỏi currentSettings
            for (let acc of currentSettings.accounts) {
                for (let src of acc.sources) {
                    for (let gal of src.galleries) {
                        gal.widgetSettings = gal.widgetSettings.filter(setting => !idsToDelete.includes(setting.id));
                    }
                }
            }

            const newMetafield = new admin.rest.resources.Metafield({ session });
            newMetafield.namespace = "custom";
            newMetafield.key = "account_data";
            newMetafield.value = JSON.stringify(currentSettings);
            newMetafield.type = "json";

            await newMetafield.save({ update: true });

            await db.widgetSetting.deleteMany({
                where: { id: { in: widgetIds } }
            });

            return json({
                success: true,
                message: `${widgetsToDelete.length} widgets deleted successfully.`
            }, { status: 200 });
        } else {
            return json({ error: "Unknown action type." }, { status: 400 });
        }
    } catch (error) {
        console.error("Cannot load database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
};

export default function TabsWithTablesExample() {
    //Load data từ loader
    const loaderData = useLoaderData()
    const posts = loaderData?.posts || [] // Biến lưu thông tin bài viết
    const widget = loaderData?.widget || [] // Biến lưu thông tin mảng setting
    const gallerys = loaderData?.gallerys || []
    const [searchParams] = useSearchParams()
    const modalId = searchParams.get("id")
    const fetcher = useFetcher()

    //Tạo biến để sử dụng modal và savebar
    const shopify = useAppBridge()
    //Xử dụng hook useSubmit để đấy dữ liệu từ hàm front sang action ở back
    const navigate = useNavigate();
    //Tạo trạng thái lưu để hiển thị 
    const [isLoaded, setIsLoaded] = useState(false); // Theo dõi xem dữ liệu đã load xong chưa
    const [isSaving, setIsSaving] = useState(false); // Theo dõi xem người dùng có đang lưu hay không
    const [isResetting, setIsResetting] = useState(false); // Cờ theo dõi trạng thái reset
    const [currentIdWidget, setCurrentIdWidget] = useState() //Lưu id của widget hiện tại
    //Hiển thị thông báo toast khi thực hiện hành động thành công
    useEffect(() => {
        const widgetLength = widget.length
        if (fetcher.state === "loading") {
            // Hiển thị toast khi lưu và load dữ liệu thành công
            shopify.toast.show(fetcher.data?.message, {
                duration: 1500,
            })
            // Ẩn save bar
            shopify.saveBar.hide("my-save-bar")
            shopify.loading(false) // tắt loading
            setIsLoaded(true)
            setIsSaving(false)
            if (fetcher.data?.message == "Widget updated successfully.") return //Không làm gì nếu update
            else if (fetcher.data?.message == "Widget created successfully.") navigate(`?id=${widgetLength}`) //Chuyển đến id vừa được tạo
            else shopify.modal.hide('modal-confirm-delete') // ẩn modal xác nhận xóa
        }
    }, [isSaving, isLoaded, shopify, fetcher.state, fetcher.data?.message, navigate, widget.length]); // Chạy effect khi isSaving hoặc privacyValue thay đổi
    //Hàm xử lý nút save của savebar
    const handleSave = async (index) => {
        const id = widget[index]?.id
        try {
            // Thu thập dữ liệu từ các trạng thái
            const actionType = "create"; // Hoặc bất kỳ hành động nào bạn cần
            const formData = {
                widgetId: id,
                widgetName: textFieldValue,
                gallary: selectedSelect,
                widgetTemplate: 'Basic grid',
                numberOfColumns: rangeValueColumn,
                numberOfRows: rangeValueRow,
                accountName: 'tungvan2024',
                paddingImg: rangeValuePadding,
                borderImg: rangeValueBorder,
                widgetLayout: selectedLayout,
                hotspotColor: valueHotspotColor,
                hotspotHoverColor: valueHotspotHover,
                selectedHeadingSetting: selectedHeadingSetting,
                switchChoiceHeadingDesc: switchChoiceHeadingDesc,
                switchChoiceHeadingTitle: switchChoiceHeadingTitle,
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
            setIsSaving(true) // Ẩn SaveBar
        }
    }
    //Hàm xóa bản ghi widget setting
    const handleDeleteSetting = async (index) => {
        // Lấy 1 mảng ids widget setting từ 1 mảng index nhận được 
        const ids = index.map(i => widget[i]?.id).filter(id => id !== undefined && id !== null);
        try {
            const actionType = 'delete'
            const formData = {
                ids: ids,
                _action: actionType
            }
            //Gửi dũ liệu lên server hàm action
            await fetcher.submit(formData, { method: 'post' })
            shopify.loading(true)
            console.log("Delete successfull", formData)

        } catch (error) {
            console.error("Error delete database:", error);
            console.log("Cannot delete!");
        } finally {
            setIsSaving(true)
        }
    }
    //Hàm xử lý nút discard của savebar
    const handleDiscard = () => {
        console.log('Discarding');
        shopify.saveBar.hide('my-save-bar');
    }

    //Xử lý input text 
    const [textFieldValue, setTextFieldValue] = useState("");
    const [showError, setShowError] = useState(false);
    const handleTextFieldChange = useCallback(
        (value) => {
            setTextFieldValue(value);
            if (showError) {
                // Xóa lỗi khi người dùng bắt đầu nhập lại
                setShowError(false)
            } else if (value === '') {
                //Hiện thị lại lỗi nếu người dùng xóa hết
                setShowError(true)
            }
        },
        [showError]
    );
    //Xử lý input select
    const [selectedSelect, setSelectedSelect] = useState(gallerys[0].galleyName);
    const handleSelectChange = useCallback(
        (value) => {
            setSelectedSelect(value);
        },
        [],
    );
    //Xử lý setting layout số cột
    const [rangeValueColumn, setRangeValueColumn] = useState(4);
    const handleRangeSliderChangeColumn = useCallback(
        (value) => setRangeValueColumn(value),
        [],
    );
    //Xử lý setting layout số dòng
    const [rangeValueRow, setRangeValueRow] = useState(2);
    const handleRangeSliderChangeRow = useCallback(
        (value) => setRangeValueRow(value),
        [],
    );
    //Xử lý setting layout padding lẫn nhau
    const [rangeValuePadding, setRangeValuePadding] = useState(1);
    const handleRangeSliderChangePadding = useCallback(
        (value) => setRangeValuePadding(value),
        [],
    );
    //Xử lý setting layout boder của hình ảnh
    const [rangeValueBorder, setRangeValueBorder] = useState(1);
    const handleRangeSliderChangeBorder = useCallback(
        (value) => setRangeValueBorder(value),
        [],
    );
    // State để lưu layout hiện tại
    const [selectedLayout, setSelectedLayout] = useState(1);

    // useRef lưu giá trị trước đó
    const previousValueLayoutWidget = useRef(selectedLayout);

    // Hàm xử lý khi chọn layout mới
    const handleSelect = useCallback((value) => {
        previousValueLayoutWidget.current = selectedLayout; // Lưu giá trị cũ trước khi thay đổi
        setSelectedLayout(value);
    }, [selectedLayout]);

    // Hàm quay lại giá trị trước đó
    const undoChangeLayoutWidget = () => {
        setSelectedLayout(previousValueLayoutWidget.current); // Khôi phục giá trị cũ
    };
    //Custom switch
    const [switchChoiceHeadingTitle, setSwitchChoiceHeadingTitle] = useState(false);
    const handleSwitchChoiceHeadingTitle = (state) => {
        setSwitchChoiceHeadingTitle((prev) => !prev)
    }
    const [switchChoiceHeadingDesc, setSwitchChoiceHeadingDesc] = useState(false);
    const handleSwitchChoiceHeadingDesc = (state) => {
        setSwitchChoiceHeadingDesc((prev) => !prev)
    }
    //Xử lý hiển thị header 
    const [selectedHeadingSetting, setSelectedHeadingSetting] = useState(['basic']);
    const handleChoiceListChange = useCallback(
        (value) => setSelectedHeadingSetting(value),
        [],
    );
    //Xử lý lựa chọn open tab
    const [selectedOpenTab, setSelectedOpenTab] = useState(['hidden']);
    const handleChangeOpenTab = useCallback((value) => setSelectedOpenTab(value), []);
    //Toggle thay đổi preview sang shopping và layout
    const [previewShoping, setPreviewShoping] = useState(true);
    const handleTogglePreviewShoping = () => {
        const newState = !previewShoping;
        setPreviewShoping(newState);
    };
    // Hàm renderChildren để tạo nội dung con
    const renderChildren = useCallback(
        (isSelected) => {
            // Trường hợp isSelected và selectedHeadingSetting là "basic"
            if (isSelected && selectedHeadingSetting.includes("basic")) {
                return (
                    <>
                        <div className="basic-choice-title" style={{ display: "flex", justifyContent: "space-between", marginBlockStart: "16px", alignItems: "center", height: "28px" }}>
                            <div className="basic-choice-title-wrapper" style={{ display: "flex", gap: "8px" }}>
                                <Switch initialState={switchChoiceHeadingTitle} onToggle={handleSwitchChoiceHeadingTitle} />
                                <div className="basic-choice-title-wrapper-name">Enabale Title</div>
                            </div>
                            {switchChoiceHeadingTitle && <Button icon={EditIcon}>Edit</Button>}
                        </div>
                        <div className="basic-choice-title" style={{ display: "flex", justifyContent: "space-between", marginBlockStart: "16px", marginBlockEnd: '10px', alignItems: "center", height: "28px" }}>
                            <div className="basic-choice-title-wrapper" style={{ display: "flex", gap: "8px" }}>
                                <Switch initialState={switchChoiceHeadingDesc} onToggle={handleSwitchChoiceHeadingDesc} />
                                <div className="basic-choice-title-wrapper-name">Enable Description</div>
                            </div>
                            {switchChoiceHeadingDesc && <Button icon={EditIcon}>Edit</Button>}
                        </div>
                    </>
                );
            }

            // Trường hợp isSelected và selectedHeadingSetting là "account"
            if (isSelected && selectedHeadingSetting.includes("account")) {
                return (
                    <>
                        <div style={{ marginBlockStart: "10px" }}>
                            <Select
                                options={[
                                    {
                                        label: 'Tungvan2024',
                                        value: 'Decrease',
                                        prefix: <Icon source={ProfileIcon} />,
                                    },
                                ]}
                                onChange={handleSelectChange}
                                value={selected}
                            />
                        </div>
                        <div className="basic-choice-title" style={{ display: "flex", justifyContent: "space-between", marginBlockStart: "16px" }}>
                            <div className="basic-choice-title-wrapper" style={{ display: "flex", gap: "8px" }}>
                                <Switch initialState={false} onToggle={{}} />
                                <div className="basic-choice-title-wrapper-name">Enable “Follow” button</div>
                            </div>
                            <Button icon={EditIcon}>Edit</Button>
                        </div>
                    </>
                );
            }
        },
        [selectedHeadingSetting, switchChoiceHeadingDesc, switchChoiceHeadingTitle]
    );

    //Color

    function hsbToRgb(h, s, b) {
        const chroma = b * s; // Độ bão hòa ảnh hưởng đến độ sáng
        const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
        const m = b - chroma;

        let r = 0, g = 0, b_ = 0;

        if (h >= 0 && h < 60) {
            r = chroma; g = x; b_ = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = chroma; b_ = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = chroma; b_ = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b_ = chroma;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b_ = chroma;
        } else if (h >= 300 && h < 360) {
            r = chroma; g = 0; b_ = x;
        }

        // Cộng thêm m để đưa về thang [0, 1]
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b_ = Math.round((b_ + m) * 255);

        return { r, g, b: b_ };
    }
    function rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    function alphaToHex(alpha) {
        return Math.round(alpha * 255).toString(16).padStart(2, '0');
    }
    function hsbToHex(h, s, b, alpha = 1) {
        // Chuyển đổi HSB sang RGB
        const { r, g, b: blue } = hsbToRgb(h, s, b);

        // Chuyển đổi RGB sang HEX
        const hex = rgbToHex(r, g, blue);

        // Nếu alpha được cung cấp, thêm nó vào cuối HEX
        if (alpha !== 1) {
            return hex + alphaToHex(alpha);
        }

        return hex;
    }
    //Color Hotspot color
    const [colorHotspotHover, setColorHotspotHover] = useState({
        hue: 120,
        brightness: 1,
        saturation: 1,
        alpha: 0.7,
    });
    const [valueHotspotHover, setValueHotspotHover] = useState();
    const handleChangeInputValueHotspotHover = useCallback(
        (newValue) => setValueHotspotHover(newValue),
        [],
    );
    const [valueHotspotHoverAlpha, setValueHotspotHoverAlpha] = useState(
        Math.round(colorHotspotHover.alpha * 100) // Chuyển alpha thành %
    );

    // Cập nhật giá trị alpha dựa trên giá trị nhập vào (dưới dạng phần trăm)
    const handleChangeInputValueHotspotHoverAlpha = useCallback(
        (newValue) => {
            // Nếu người dùng xóa hết nội dung, đặt giá trị về 0
            if (newValue === "") {
                setValueHotspotHoverAlpha(0);
                setColorHotspotHover((prev) => ({
                    ...prev,
                    alpha: 0, // Alpha bằng 0
                }));
                return;
            }

            // Chuyển đổi giá trị nhập thành số
            const numericValue = parseFloat(newValue);

            // Nếu giá trị vượt quá 100, giới hạn nó ở 100
            const clampedValue = Math.min(Math.max(numericValue, 0), 100);

            // Cập nhật trạng thái
            setValueHotspotHoverAlpha(clampedValue);
            setColorHotspotHover((prev) => ({
                ...prev,
                alpha: clampedValue / 100, // Chuyển đổi % thành giá trị alpha (0–1)
            }));
        },
        []
    );
    const [popoverActiveHotspotHover, setPopoverActiveHotspotHover] = useState(false);
    const togglePopoverActiveHotspotHover = useCallback(
        () => setPopoverActiveHotspotHover((popoverActive) => !popoverActive),
        [],
    );
    // Color Hotspot Hover
    const [colorHotspotColor, setColorHotspotColor] = useState({
        hue: 120,
        brightness: 1,
        saturation: 1,
        alpha: 0.7,
    });
    const [valueHotspotColor, setValueHotspotColor] = useState();
    const handleChangeInputValueColor = useCallback(
        (newValue) => setValueHotspotColor(newValue),
        [],
    );
    const [popoverActiveHotspotColor, setPopoverActiveHotspotColor] = useState(false);
    const togglePopoverActiveHotspotColor = useCallback(
        () => setPopoverActiveHotspotColor((popoverActive) => !popoverActive),
        [],
    );
    const [checkedAlpha, setCheckedAlpha] = useState(false);
    const handleChangeCheckedAlpha = useCallback(
        (newChecked) => setCheckedAlpha(newChecked),
        [],
    );
    // Cập nhật giá trị alpha khi trạng thái `checkedAlpha` thay đổi
    useEffect(() => {
        setColorHotspotHover((prev) => ({
            ...prev,
            alpha: checkedAlpha ? 0 : 1, // Alpha bằng 0 nếu checkedAlpha = true
        }));
    }, [checkedAlpha]);
    // Cập nhật giá trị HEX khi `color` thay đổi
    useEffect(() => {
        const hexColor = hsbToHex(
            colorHotspotColor.hue,
            colorHotspotColor.saturation,
            colorHotspotColor.brightness
        );
        const hexColorHover = hsbToHex(
            colorHotspotHover.hue,
            colorHotspotHover.saturation,
            colorHotspotHover.brightness,
            colorHotspotHover.alpha
        );
        setValueHotspotColor(hexColor.toUpperCase());
        setValueHotspotHover(hexColorHover.toUpperCase())
        setValueHotspotHoverAlpha(Math.round(colorHotspotHover.alpha * 100))

    }, [colorHotspotColor, colorHotspotHover]);



    //Xử lý khi có thay đổi setting
    const isFormChanged = (id) => {
        const formValues = defaultForm(id); // Gọi hàm và lưu kết quả vào biến
        console.log("🚀 ~ isFormChanged ~ formValues:", formValues)

        return (
            textFieldValue !== formValues.widgetName ||
            selectedSelect !== formValues.gallery ||
            rangeValueColumn !== formValues.rangeValueColumn ||
            rangeValueRow !== formValues.rangeValueRow ||
            rangeValueBorder !== formValues.rangeValueBorder ||
            rangeValuePadding !== formValues.rangeValuePadding ||
            (selectedLayout !== formValues.widgetLayout && selectedLayout !== 10) ||
            switchChoiceHeadingDesc !== formValues.basicDesc ||
            switchChoiceHeadingTitle !== formValues.basicTitle ||
            selectedHeadingSetting[0] !== formValues.accountInfor ||
            valueHotspotColor !== formValues.colorHotspot ||
            valueHotspotHover !== formValues.colorPopup
        )

    }

    const defaultForm = (index) => {
        let ojectHeading = widget[index]?.heading ? JSON.parse(widget[index].heading) : {}

        return {
            widgetName: widget[index]?.widgetName || '',
            gallery: widget[index]?.gallary || 'default',
            rangeValueColumn: widget[index]?.numberOfColumns || 4,
            rangeValueRow: widget[index]?.numberOfRows || 2,
            rangeValuePadding: widget[index]?.paddingImg || 0,
            rangeValueBorder: widget[index]?.borderImg || 1,
            widgetLayout: widget[index]?.widgetLayout || 1,
            basicTitle: ojectHeading.switchChoiceHeadingTitle || false,
            basicDesc: ojectHeading.switchChoiceHeadingDesc || false,
            accountInfor: ojectHeading.selectedHeadingSetting || "none",
            colorHotspot: widget[index]?.hotSpotColor || '',
            colorPopup: widget[index]?.hotSpotHoverColor || ''
        };
    };
    //Kiểm tra thay đổi setting theo từng bản ghi
    useEffect(() => {
        // Chỉ kiểm tra khi dữ liệu đã load xong
        if (isResetting) {
            // Ẩn saveBar khi đang reset
            shopify.saveBar.hide("my-save-bar");
            setIsResetting(false); // Reset trạng thái sau khi xử lý
        }
        else if (isFormChanged(currentIdWidget)) {
            setIsLoaded(false);
            shopify.saveBar.show("my-save-bar");
        } else {
            setIsLoaded(true);
            shopify.saveBar.hide("my-save-bar");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        textFieldValue,
        selectedSelect,
        rangeValueColumn,
        rangeValueRow,
        rangeValuePadding,
        rangeValueBorder,
        selectedLayout,
        switchChoiceHeadingDesc,
        switchChoiceHeadingTitle,
        selectedHeadingSetting,
        valueHotspotColor,
        valueHotspotHover
    ]);
    // reset lỗi khi mở modal tạo mới
    useEffect(() => {
        if (textFieldValue !== '' && showError) setShowError(false)
    }, [showError, textFieldValue])

    //hàm resetForm
    const resetForm = (id) => {
        const formValues = defaultForm(id); // Gọi hàm và lưu kết quả vào biến
        setTextFieldValue(formValues.widgetName);
        setSelectedSelect(formValues.gallery);
        setRangeValueColumn(formValues.rangeValueColumn);
        setRangeValueRow(formValues.rangeValueRow);
        setRangeValueBorder(formValues.rangeValueBorder);
        setRangeValuePadding(formValues.rangeValuePadding);
        setSelectedLayout(formValues.widgetLayout)
        setCurrentView("default")
        setSwitchChoiceHeadingDesc(false)
        setSwitchChoiceHeadingTitle(false)
        setSelectedHeadingSetting(["basic"])
        setColorHotspotColor({
            hue: 120,
            brightness: 1,
            saturation: 1,
            alpha: 0.7,
        })
        setColorHotspotHover({
            hue: 120,
            brightness: 1,
            saturation: 1,
            alpha: 0.7,
        })
    };


    //hàm làm trống form khi tạo widget mới
    const emptyForm = () => {
        setCurrentIdWidget(null)
        setIsResetting(true); // Bật cờ reset
        setTextFieldValue("")
        setSelectedSelect('default')
        setRangeValueColumn(4)
        setRangeValueRow(2)
        setRangeValueBorder(1)
        setRangeValuePadding(1)
        setSelectedLayout(1)
        setCurrentView("default")
        setSwitchChoiceHeadingDesc(false)
        setSwitchChoiceHeadingTitle(false)
        setSelectedHeadingSetting(["basic"])
        setColorHotspotColor({
            hue: 120,
            brightness: 1,
            saturation: 1,
            alpha: 0.7,
        })
        setColorHotspotHover({
            hue: 120,
            brightness: 1,
            saturation: 1,
            alpha: 0.7,
        })
    }
    //useEffect để loading xong
    useEffect(() => {
        shopify.loading(false);
    }, [shopify]);

    //trạng thái sidebar
    const [currentView, setCurrentView] = React.useState('default');

    //Hàm xử lý giao diện khi chuyển stepper
    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return <>
                    <div className="modal-content-setting-content">
                        <div className="modal-content-aside-config" style={{ margin: "16px 0" }}>
                            <div className="modal-content-aside-config-input" style={{ marginBottom: "16px" }}>
                                <TextField
                                    label="Widget name"
                                    maxLength={20}
                                    autoComplete="off"
                                    showCharacterCount
                                    placeholder="Enter widget name"
                                    error={showError && "Widget name is required"}
                                    value={textFieldValue}
                                    onChange={handleTextFieldChange}
                                />
                                <Select
                                    label="Gallery"
                                    options={[
                                        { label: 'Select gallery', value: 'default', disabled: true },
                                        ...gallerys.map(gallery => ({ label: gallery.galleyName, value: gallery.galleyName }))
                                    ]}
                                    onChange={handleSelectChange}
                                    value={selectedSelect}
                                />
                            </div>
                            <Divider />
                            <div className="modal-content-aside-config-widget" style={{ marginTop: "16px", marginBottom: '16px' }}>
                                <Text variant="headingMd" as="h6">
                                    Choose widget template
                                </Text>
                            </div>
                            <div className="tab-select-container">
                                {stepsPreview.map((step, index) => (
                                    <div
                                        key={index}
                                        className={`tab-select-item ${activeStepPreview === index ? "is-active" : ""}`}
                                        onClick={() => setActiveStepPreview(index)}
                                    >
                                        <div className="tab-select-item-name">
                                            <div className="tab-select-item-icon">
                                                {step.icon}
                                            </div>
                                            {step.title}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-content-aside-config-view">
                            <div key={1} onClick={() => handleSelect(1)} className={`modal-content-aside-config-view-item ${selectedLayout === 1 ? 'selected' : ''}`}>
                                <div className="modal-content-aside-config-view-item-img">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="82" fill="none" viewBox="0 0 112 82"><rect width="15.958" height="15.958" x="7.5" y="22.5" fill="#101010" fillOpacity=".15" stroke="#101010" rx="3.5"></rect><rect width="15.958" height="15.958" x="27.542" y="42.542" fill="#101010" fillOpacity=".15" stroke="#101010" rx="3.5"></rect><rect width="15.958" height="15.958" x="47.583" y="22.5" fill="#101010" fillOpacity=".15" stroke="#101010" rx="3.5"></rect><rect width="15.958" height="15.958" x="67.625" y="42.542" fill="#101010" fillOpacity=".15" stroke="#101010" rx="3.5"></rect><rect width="16.958" height="16.958" x="87.167" y="42.042" fill="#101010" fillOpacity=".15" rx="4"></rect><rect width="16.958" height="16.958" x="27.042" y="22" fill="#101010" fillOpacity=".15" rx="4"></rect><rect width="16.958" height="16.958" x="7" y="42.042" fill="#101010" fillOpacity=".15" rx="4"></rect><rect width="16.958" height="16.958" x="47.083" y="42.042" fill="#101010" fillOpacity=".15" rx="4"></rect><rect width="16.958" height="16.958" x="67.125" y="22" fill="#101010" fillOpacity=".15" rx="4"></rect><rect width="15.958" height="15.958" x="87.667" y="22.5" fill="#101010" fillOpacity=".15" stroke="#101010" rx="3.5"></rect></svg>
                                </div>
                                <div className="modal-content-aside-config-view-item-label"></div>
                            </div>
                            <div key={2} onClick={() => handleSelect(2)} className={`modal-content-aside-config-view-item ${selectedLayout === 2 ? 'selected' : ''}`}>
                                <div className="modal-content-aside-config-view-item-img">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="82" fill="none" viewBox="0 0 112 82"><path fill="#E6E6E6" d="M8 22.226h19.2v19.2H8z"></path><path fill="#CDCDCD" d="M27.2 22.226h19.2v19.2H27.2z"></path><path fill="#E6E6E6" d="M46.4 22.226h19.2v19.2H46.4z"></path><path fill="#CDCDCD" d="M65.6 22.226h19.2v19.2H65.6z"></path><path fill="#E6E6E6" d="M84.8 22.226H104v19.2H84.8z"></path><path fill="#CDCDCD" d="M8 41.426h19.2v19.2H8z"></path><path fill="#E6E6E6" d="M27.2 41.426h19.2v19.2H27.2z"></path><path fill="#CDCDCD" d="M46.4 41.426h19.2v19.2H46.4z"></path><path fill="#E6E6E6" d="M65.6 41.426h19.2v19.2H65.6z"></path><path fill="#CDCDCD" d="M84.8 41.426H104v19.2H84.8z"></path></svg>
                                </div>
                                <div className="modal-content-aside-config-view-item-label"></div>
                            </div>
                            <div key={3} onClick={() => handleSelect(3)} className={`modal-content-aside-config-view-item ${selectedLayout === 3 ? 'selected' : ''}`}>
                                <div className="modal-content-aside-config-view-item-img">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="82" fill="none" viewBox="0 0 112 82"><path fill="#E6E6E6" d="M8 23.214h36.571v36.571H8zm39.618 0H64.38v16.762H47.618zm19.811 19.81h16.762v16.762H67.429zm19.809 0H104v16.762H87.238zm-39.62 0H64.38v16.762H47.618zm19.811-19.81h16.762v16.762H67.429zm19.809 0H104v16.762H87.238z"></path></svg>
                                </div>
                                <div className="modal-content-aside-config-view-item-label"></div>
                            </div>
                            <div key={4} onClick={() => handleSelect(4)} className={`modal-content-aside-config-view-item ${selectedLayout === 4 ? 'selected' : ''}`}>
                                <div className="modal-content-aside-config-view-item-img">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="82" fill="none" viewBox="0 0 112 82"><rect width="16.958" height="16.958" x="7" y="33" fill="#E6E6E6" rx="3.083"></rect><rect width="16.958" height="16.958" x="47.083" y="33" fill="#E6E6E6" rx="3.083"></rect><rect width="16.958" height="16.958" x="27.042" y="33" fill="#E6E6E6" rx="3.083"></rect><rect width="16.958" height="16.958" x="67.125" y="33" fill="#E6E6E6" rx="3.083"></rect><rect width="16.958" height="16.958" x="87.167" y="33" fill="#E6E6E6" rx="3.083"></rect><path fill="#7B7D81" fillRule="evenodd" d="M108 37h-8v8h8v-8Zm-4.539 6.156 1.516-1.523a.184.184 0 0 0 0-.258l-1.516-1.523a.194.194 0 0 0-.266 0l-.179.18a.192.192 0 0 0 0 .265l1.203 1.203-1.203 1.21a.192.192 0 0 0 0 .267l.179.18c.071.07.188.07.266 0ZM4 37h8v8H4v-8Zm4.54 6.156-1.517-1.523a.184.184 0 0 1 0-.258l1.516-1.523a.193.193 0 0 1 .266 0l.18.18c.07.07.07.187 0 .265L7.78 41.5l1.203 1.21c.07.08.07.196 0 .267l-.18.18a.193.193 0 0 1-.265 0Z" clipRule="evenodd"></path></svg>
                                </div>
                                <div className="modal-content-aside-config-view-item-label"></div>
                            </div>
                            <div key={5} onClick={() => handleSelect(5)} className={`modal-content-aside-config-view-item ${selectedLayout === 5 ? 'selected' : ''}`}>
                                <div className="modal-content-aside-config-view-item-img">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="82" fill="none" viewBox="0 0 112 82"><rect width="11.887" height="11.887" x="22.049" y="49.067" fill="#E6E6E6" rx="2.161"></rect><rect width="11.887" height="11.887" fill="#E6E6E6" rx="2.161" transform="matrix(1 0 0 -1 50.057 32.887)"></rect><rect width="25.634" height="25.634" x="8" y="21" fill="#E6E6E6" rx="2.161"></rect><rect width="25.634" height="25.634" fill="#E6E6E6" rx="2.161" transform="matrix(1 0 0 -1 36.038 60.954)"></rect><rect width="11.887" height="11.887" x="8" y="49.067" fill="#E6E6E6" rx="2.161"></rect><rect width="11.887" height="11.887" fill="#E6E6E6" rx="2.161" transform="matrix(1 0 0 -1 36.038 32.887)"></rect><rect width="11.887" height="11.887" x="78.124" y="49.067" fill="#E6E6E6" rx="2.161"></rect><rect width="11.887" height="11.887" x="92.113" y="49.038" fill="#E6E6E6" rx="2.161"></rect><rect width="11.887" height="11.887" x="92.113" y="35.019" fill="#E6E6E6" rx="2.161"></rect><rect width="11.887" height="11.887" x="92.113" y="21" fill="#E6E6E6" rx="2.161"></rect><rect width="25.634" height="25.634" x="64.075" y="21" fill="#E6E6E6" rx="2.161"></rect><rect width="11.887" height="11.887" x="64.075" y="49.067" fill="#E6E6E6" rx="2.161"></rect></svg>
                                </div>
                                <div className="modal-content-aside-config-view-item-label"></div>
                            </div>
                            <div key={6} onClick={() => handleSelect(6)} className={`modal-content-aside-config-view-item ${selectedLayout === 6 ? 'selected' : ''}`}>
                                <div className="modal-content-aside-config-view-item-img">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="82" fill="none" viewBox="0 0 112 82"><rect width="13.915" height="13.915" x="7.5" y="26" fill="#E6E6E6" rx="2.53"></rect><rect width="13.915" height="13.915" x="23.944" y="42.444" fill="#E6E6E6" rx="2.53"></rect><rect width="13.915" height="13.915" x="23.944" y="26" fill="#E6E6E6" rx="2.53"></rect><rect width="13.915" height="13.915" x="7.5" y="42.444" fill="#E6E6E6" rx="2.53"></rect><rect width="30.007" height="30.007" fill="#E6E6E6" rx="2.53" transform="matrix(1 0 0 -1 40.32 56.359)"></rect><rect width="13.915" height="13.915" x="73.141" y="26" fill="#E6E6E6" rx="2.53"></rect><rect width="13.915" height="13.915" x="89.585" y="42.444" fill="#E6E6E6" rx="2.53"></rect><rect width="13.915" height="13.915" x="89.585" y="26" fill="#E6E6E6" rx="2.53"></rect><rect width="13.915" height="13.915" x="73.141" y="42.444" fill="#E6E6E6" rx="2.53"></rect></svg>
                                </div>
                                <div className="modal-content-aside-config-view-item-label"></div>
                            </div>
                        </div>
                    </div>
                </>
            case 1:
                return <>
                    <div style={{ marginBottom: '16px', marginTop: '16px' }}>
                        <Text variant="headingMd" as="h6">
                            Configuration
                        </Text>
                    </div>
                    <Divider />
                    <div className="widget-setting">
                        <div className="widget-setting-item" onClick={() => setCurrentView('layoutSettings')}>
                            <div className="widget-setting-item-label" >Layout settings</div>
                            <div>
                                <Icon
                                    source={ChevronRightIcon}
                                    tone="base"
                                />
                            </div>
                        </div>
                        <div className="widget-setting-item" onClick={() => setCurrentView('headingSettings')}>
                            <div className="widget-setting-item-label">Heading settings</div>
                            <div>
                                <Icon
                                    source={ChevronRightIcon}
                                    tone="base"
                                />
                            </div>
                        </div>
                        <div className="widget-setting-item" onClick={() => { setCurrentView('shopingSettings'); handleTogglePreviewShoping(); }}>
                            <div className="widget-setting-item-label">Shoppable settings</div>
                            <div>
                                <Icon
                                    source={ChevronRightIcon}
                                    tone="base"
                                />
                            </div>
                        </div>
                    </div>
                </>
            case 2:
                return <>
                    <div className="widget-install">
                        <div className="widget-install-item">
                            <div className="widget-install-item-order">1</div>
                            <div className="widget-install-item-content">
                                <div className="widget-install-item-content-label">
                                    Enable App Embed
                                </div>
                                <div className="widget-install-item-content-des">
                                    Go to Theme Editor -&gt; <a target="_blank" href="https://test-qr-app.myshopify.com/admin/themes/current/editor?context=apps&amp;activateAppId=508b8d5b-b176-4dc6-a0ba-2b222db6eb79/social-widget">Enable Socialwidget’s App Embed.</a> Make sure you Save it.
                                </div>
                                <div className="widget-install-item-content-img">
                                    <img src="https://widget.onecommerce.io/assets/enable-app-embed-B36i16qK.webp" alt="" />
                                </div>
                            </div>
                        </div>
                        <div className="widget-install-item">
                            <div className="widget-install-item-order">2</div>
                            <div className="widget-install-item-content">
                                <div className="widget-install-item-content-label">
                                    Install widget on your theme
                                </div>
                                <div className="widget-install-item-content-des">
                                    With Online Store 2.0, you can add Socialwidget App Block into your Theme Editor and choose “Default widget” on the dropdown.
                                </div>
                                <div className="widget-install-item-content-img">
                                    <img src="https://widget.onecommerce.io/assets/enable-app-embed-B36i16qK.webp" alt="" />
                                </div>
                            </div>
                        </div>

                    </div>
                </>
            default:
                return
        }
    }

    const renderHeaderSetting = (selectedHeadingSetting) => {
        if (selectedHeadingSetting.includes("basic")) {
            return (
                <>
                    {switchChoiceHeadingTitle && <div className="preview-feed-title">Follow Us on Instagram</div>}
                    {switchChoiceHeadingDesc && <div className="preview-feed-desc">Follow us so you'll never miss an update</div>}
                </>
            )
        }
        if (selectedHeadingSetting.includes("account")) {
            return (
                <>
                    <div className="preview-feed-account">
                        <div className="preview-feed-account-avatar">
                            <img className="preview-feed-account-avatar-main" src="https://widget.onecommerce.io/assets/default-avatar-CdrAMLQT.svg" alt="123" />
                            <img className="preview-feed-account-avatar-instagram-logo" src="https://widget.onecommerce.io/assets/InstagramAvatarIcon-DJZhoqG0.svg" alt="123" />
                        </div>
                        <div className="preview-feed-account-detail">
                            <div className="preview-feed-account-detail-header">
                                <div className="preview-feed-account-detail-header-name">Tungvan2024</div>
                                <div className="preview-feed-account-detail-header-button-follow"><span style={{ color: '#FFFF' }}>Follow</span></div>
                            </div>
                            <div className="preview-feed-account-detail-number">
                                <div className="preview-feed-account-detail-number-post"><b>12</b> Post</div>
                                <div className="preview-feed-account-detail-number-follower"><b>0</b> Follower</div>
                                <div className="preview-feed-account-detail-number-following"><b>0</b> Fllowing</div>
                            </div>
                            <div className="preview-feed-account-detail-account-name">Tungvan2024</div>
                        </div>
                    </div>
                </>
            )
        }
    }
    const getPreviewContent = (chose) => {
        switch (chose) {
            case 0:
                return (
                    <Scrollable style={{ height: 'calc(100vh - 52px)' }}>
                        <div className="preview-feed-container-desktop">
                            {previewShoping ? (
                                <>
                                    <div className="preview-feed-bar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="68" height="12" viewBox="0 0 68 12" fill="none">
                                            <ellipse cx="7.43835" cy="6" rx="6.6361" ry="6" fill="#FFE5E6"></ellipse>
                                            <ellipse cx="34.5362" cy="6" rx="6.08309" ry="6" fill="#FFF0BF"></ellipse>
                                            <ellipse cx="61.0802" cy="6" rx="6.08309" ry="6" fill="#C2F2D8"></ellipse>
                                        </svg>
                                    </div>
                                    {renderHeaderSetting(selectedHeadingSetting)}
                                    {renderSelectedLayout(selectedLayout)}
                                </>
                            ) : (
                                <div className="preview-instagram-popup">
                                    <div className="preview-instagram-popup-container">
                                        <div className="preview-instagram-popup-wrapper">
                                            <div className="preview-instagram-popup-image">
                                                <img src="https://widget.onecommerce.io/assets/instagram-popup-image-BZzyfB8R.webp" alt="123" />
                                                <div className="widget-hotspot">
                                                    <div className="widget-hotspot-item" style={{ top: "35%", right: "73%", background: valueHotspotColor }}>
                                                        <div className="widget-hotspot-item-popover" style={{ background: valueHotspotHover }}>
                                                            <div className="widget-hotspot-item-popover-arrow" style={{ borderBottom: `14px solid ${valueHotspotHover}` }}></div>
                                                            <div style={{ padding: "8px 4px 8px 8px", marginInlineEnd: "16px", borderInlineEnd: "1px solid rgb(255, 255, 255)" }}>
                                                                <div style={{ whiteSpace: "nowrap" }}>Wall picture Decor AB...</div>
                                                                <div style={{ whiteSpace: "nowrap" }}>$29.99</div>
                                                            </div>
                                                            <div style={{ position: 'absolute', right: '4px' }}>
                                                                <svg width="4" height="7" viewBox="0 0 4 7" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.64062 3.71094C3.75781 3.59375 3.75781 3.42969 3.66406 3.3125L0.898438 0.59375C0.78125 0.476562 0.59375 0.476562 0.5 0.59375L0.335938 0.757812C0.21875 0.875 0.21875 1.03906 0.335938 1.15625L2.72656 3.5L0.335938 5.86719C0.21875 5.98438 0.21875 6.14844 0.335938 6.26562L0.5 6.42969C0.59375 6.54688 0.78125 6.54688 0.898438 6.42969L3.64062 3.71094Z" fill="white"></path></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="widget-hotspot-item" style={{ top: "50%", right: "45%", background: valueHotspotColor }}></div>
                                                    <div className="widget-hotspot-item" style={{ top: "59%", right: "23%", background: valueHotspotColor }}></div>
                                                    <div className="widget-hotspot-item" style={{ top: "76%", right: "42%", background: valueHotspotColor }}></div>
                                                    <div className="widget-hotspot-item" style={{ top: "76%", right: "77%", background: valueHotspotColor }}></div>
                                                </div>
                                            </div>
                                            <div className="preview-instagram-popup-detail">
                                                <div className="preview-instagram-popup-detail-header">
                                                    <div style={{ display: "flex", alignItems: "center" }}>
                                                        <img style={{ marginInlineEnd: "10px" }} src="https://widget.onecommerce.io/assets/instagram-popup-avatar-EWb-YXxj.webp" alt="123" />
                                                        <div style={{ fontWeight: "500" }}>Tungvan2024</div>
                                                    </div>
                                                    <div className="instagram-popup-follow-btn">
                                                        <span style={{ color: "#FFFFFF" }}>Follow</span>
                                                    </div>
                                                </div>
                                                <div class="preview-instagram-popup-detail-content">
                                                    Go behind the scenes and discover how Smarties became the first global confectionery brand to switch to recyclable paper packaging.
                                                    A move that goes a long way to achieving our goal of 100% recyclable or reusable packaging by 2025.Visit the link in our bio for the full story.
                                                </div>
                                                <div className="preview-instagram-popup-detail-shoppable">
                                                    <div className="popup-detail-shoppable-item">
                                                        <img src="https://widget.onecommerce.io/assets/popup-shoppable-thumb-DBW-Qwpl.webp" alt="123" />
                                                        <div className="popup-detail-shoppable-item-detail">
                                                            <div className="popup-detail-shoppable-item-detail-title">Wall Picture Decoration Snake ...</div>
                                                            <div className="popup-detail-shoppable-item-detail-price">$16.05 - 20.05</div>
                                                            <div className="popup-detail-shoppable-item-detail-action">VIEW DETAIL</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="preview-instagram-popup-detail-footer">
                                                    <div className="preview-instagram-popup-detail-footer-date">
                                                        OCTOBER 6, 2019
                                                        <div className="preview-instagram-popup-detail-footer-text"></div>
                                                        View on Instagram
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Scrollable>
                );
            case 1:
                return <>
                    <Scrollable style={{ height: 'calc(100vh - 52px)' }}>
                        <div className="preview-feed-container">
                            <div className="preview-feed-container-mobile">
                                <img src="https://widget.onecommerce.io/assets/phone-frame-DW58YU6i.svg" alt="" />
                                <div className="widget-configs-preview-mobile-container">
                                    <div className="simplebar-scrollable-y" style={{ height: '100%', overflow: "hidden auto" }}>
                                        <div className="simplebar-wrapper">
                                            <div className="simplebar-height-auto-observer-wrapper">
                                                <div className="simplebar-height-auto-observer"></div>
                                            </div>
                                            <div className="simplebar-mask">
                                                <div className="simplebar-offset" style={{ right: '0px', bottom: '0px' }}>
                                                    <div className="simplebar-content-wrapper">
                                                        <div className="simplebar-content">
                                                            <div className="preview-mobile-instagram-feed">
                                                                <div className="mobile-skeleton-1"></div>
                                                                <div className="mobile-skeleton">
                                                                    <svg width="259" height="77" viewBox="0 0 259 77" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.525879" width="258" height="77" rx="10" fill="#EFF3FB"></rect><rect x="16.5259" y="16" width="225" height="16" rx="3" fill="#F7FAFF"></rect><rect x="16.5259" y="46" width="179" height="16" rx="3" fill="#F7FAFF"></rect></svg>
                                                                </div>
                                                                {switchChoiceHeadingTitle && <div className="preview-feed-title">Follow Us on Instagram</div>}
                                                                {switchChoiceHeadingDesc && <div className="preview-feed-desc">Follow us so you'll never miss an update</div>}
                                                                {renderSelectedLayout(selectedLayout)}
                                                                <div className="mobile-skeleton" style={{ marginBlockStart: '10px' }}>
                                                                    <svg width="259" height="77" viewBox="0 0 259 77" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.525879" width="258" height="77" rx="10" fill="#EFF3FB"></rect><rect x="16.5259" y="16" width="225" height="16" rx="3" fill="#F7FAFF"></rect><rect x="16.5259" y="46" width="179" height="16" rx="3" fill="#F7FAFF"></rect></svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="simplebar-placeholder"></div>
                                        </div>
                                        <div className="simplebar-track simplebar-vertical"></div>
                                        <div className="simplebar-track simplebar-horizontal"></div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </Scrollable>
                </>
            default:
                return
        }
    }
    const renderSelectedLayout = (selectedLayout) => {
        switch (selectedLayout) {
            case 1:
                return (
                    <div>
                        {renderGrid(rangeValueRow, rangeValueColumn, rangeValueBorder, rangeValuePadding)}
                    </div>
                );
            case 2:
                return (
                    <div>
                        {renderGrid(rangeValueRow, rangeValueColumn, 0, 0)}
                    </div>
                );
            case 3:
                return (
                    <div class="grid-container">
                        {posts.media.data.map((image, index) => (
                            <img className={`item${index}`} key={index} src={image.media_url} alt={image.alt} style={{ width: "100%" }} />
                        ))}
                    </div>
                );
            case 4:
                return (
                    <div className="container">
                        {posts.media.data.map((image, index) => (
                            <div
                                key={index}
                                className="mySlides"
                                style={{ display: slideIndex === index + 1 ? "block" : "none" }}
                            >
                                <img src={image.media_url} alt={image.alt} style={{ width: "100%" }} />
                            </div>
                        ))}
                        <a className="prev" onClick={() => plusSlides(-1)}>
                            ❮
                        </a>
                        <a className="next" onClick={() => plusSlides(1)}>
                            ❯
                        </a>
                        <div className="row">
                            {posts.media.data.map((thumbnail, index) => (
                                <div key={index} className="column">
                                    <img
                                        className={`demo cursor ${slideIndex === index + 1 ? "active" : ""}`}
                                        src={thumbnail.media_url}
                                        alt={thumbnail.alt}
                                        style={{ width: "100%" }}
                                        onClick={() => currentSlide(index + 1)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div class="grid-container-grid">
                        {posts.media.data.map((image, index) => (
                            <img className={`item-grid${index}`} key={index} src={image.media_url} alt={image.alt} style={{ width: "100%" }} />
                        ))}
                    </div>
                );
            case 6:
                return (
                    <div class="grid-container-highlight-center">
                        {posts.media.data.map((image, index) => (
                            <img className={`item-center${index}`} key={index} src={image.media_url} alt={image.alt} style={{ width: "100%" }} />
                        ))}
                    </div>
                );
            default:
                return (
                    <>
                    </>
                );
        }
    }

    //Xử lý layout Slider widget
    const [slideIndex, setSlideIndex] = useState(1);
    const plusSlides = (n) => {
        setSlideIndex((prev) => {
            const newIndex = prev + n;
            if (newIndex > posts.media.data.length) return 1;
            if (newIndex < 1) return posts.media.data.length;
            return newIndex;
        });
    };

    const currentSlide = (n) => setSlideIndex(n);


    //Hàm sử lý giao diện khi Setting layout
    const renderSideTabContent = () => {
        switch (currentView) {
            case 'layoutSettings':
                return (
                    <div className="layout-setting">
                        <div className="layout-setting-header" style={{ marginBottom: '16px' }}>
                            <Text variant="headingMd" as="h6">
                                Layout Settings
                            </Text>
                            <div onClick={() => setCurrentView('default')} className="layout-setting-header-icon">
                                <Icon
                                    source={XIcon}
                                    tone="base"
                                />
                            </div>
                        </div>
                        <Divider />
                        <div className="layout-setting-content" style={{ marginTop: "16px" }}>
                            {/* Nội dung chỉnh sửa layout */}
                            <RangeSlider
                                output
                                label="No. of columns"
                                min={1}
                                max={10}
                                value={rangeValueColumn}
                                onChange={handleRangeSliderChangeColumn}
                                suffix={
                                    <p
                                        style={{
                                            minWidth: '24px',
                                            textAlign: 'right',
                                        }}
                                    >
                                        {rangeValueColumn}
                                    </p>
                                }
                            />
                            <RangeSlider
                                output
                                label="No. of rows"
                                min={1}
                                max={10}
                                value={rangeValueRow}
                                onChange={handleRangeSliderChangeRow}
                                suffix={
                                    <p
                                        style={{
                                            minWidth: '24px',
                                            textAlign: 'right',
                                        }}
                                    >
                                        {rangeValueRow}
                                    </p>
                                }
                            />
                            <RangeSlider
                                output
                                label="Item padding"
                                min={0}
                                max={10}
                                value={rangeValuePadding}
                                onChange={handleRangeSliderChangePadding}
                                suffix={
                                    <p
                                        style={{
                                            minWidth: '24px',
                                            textAlign: 'right',
                                        }}
                                    >
                                        {rangeValuePadding} px
                                    </p>
                                }
                            />
                            <RangeSlider
                                output
                                label="Border radius"
                                min={1}
                                max={15}
                                value={rangeValueBorder}
                                onChange={handleRangeSliderChangeBorder}
                                suffix={
                                    <p
                                        style={{
                                            minWidth: '24px',
                                            textAlign: 'right',
                                        }}
                                    >
                                        {rangeValueBorder} px
                                    </p>
                                }
                            />
                            <div className="layout-setting-content-custom">
                                <div className="layout-setting-content-custom-header-margin">
                                    Margin (px)
                                </div>
                                <div className="layout-setting-content-custom-input-margin" style={{ display: "flex", gap: '8px', marginBlockStart: '8px' }}>
                                    <TextField
                                        type="number"
                                        value={textFieldValue}
                                        onChange={handleTextFieldChange}
                                        prefix={<img src="https://widget.onecommerce.io/assets/spacing-top-DsZuNDuF.svg" alt="123" />}
                                    />

                                    <TextField
                                        type="number"
                                        value={textFieldValue}
                                        onChange={handleTextFieldChange}
                                        prefix={<img src="https://widget.onecommerce.io/assets/spacing-bottom-BDLfXUJd.svg" alt="123" />}

                                    />
                                </div>
                                <div className="layout-setting-content-custom-header-margin" style={{ marginBlockStart: '16px' }}>
                                    Padding (px)
                                </div>
                                <div className="layout-setting-content-custom-input-margin" style={{ display: "flex", gap: '8px', marginBlockStart: '8px' }}>
                                    <TextField
                                        type="number"
                                        value={textFieldValue}
                                        onChange={handleTextFieldChange}
                                        prefix={<img src="https://widget.onecommerce.io/assets/spacing-top-DsZuNDuF.svg" alt="123" />}
                                    />

                                    <TextField
                                        type="number"
                                        value={textFieldValue}
                                        onChange={handleTextFieldChange}
                                        prefix={<img src="https://widget.onecommerce.io/assets/spacing-bottom-BDLfXUJd.svg" alt="123" />}

                                    />
                                    <TextField
                                        type="number"
                                        value={textFieldValue}
                                        onChange={handleTextFieldChange}
                                        prefix={<img src="https://widget.onecommerce.io/assets/spacing-left-BkiiymVy.svg" alt="123" />}
                                    />

                                    <TextField
                                        type="number"
                                        value={textFieldValue}
                                        onChange={handleTextFieldChange}
                                        prefix={<img src="https://widget.onecommerce.io/assets/spacing-right-C1nB5XYj.svg" alt="123" />}

                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                );
            case 'headingSettings':
                return (
                    <>
                        <div className="layout-setting">
                            <div className="layout-setting-header" style={{ marginBottom: '16px' }}>
                                <Text variant="headingMd" as="h6">
                                    Heading Settings
                                </Text>
                                <div onClick={() => setCurrentView('default')} className="layout-setting-header-icon">
                                    <Icon
                                        source={XIcon}
                                        tone="base"
                                    />
                                </div>
                            </div>
                            <Divider />
                            <div style={{ marginBlockStart: "16px" }}>
                                <ChoiceList
                                    choices={[
                                        {
                                            label: 'Basic',
                                            value: 'basic',
                                            renderChildren,
                                        },
                                        {
                                            label: 'Choose and show your account information',
                                            value: 'account',
                                            renderChildren,
                                        },
                                    ]}
                                    selected={selectedHeadingSetting}
                                    onChange={handleChoiceListChange}
                                />
                            </div>
                        </div>
                    </>
                )

            case 'shopingSettings':
                return (
                    <>
                        <div className="layout-setting">
                            <div className="layout-setting-header" style={{ marginBottom: '16px' }}>
                                <Text variant="headingMd" as="h6">
                                    Shoppable settings
                                </Text>
                                <div onClick={() => { setCurrentView('default'); handleTogglePreviewShoping(); }} className="layout-setting-header-icon">
                                    <Icon
                                        source={XIcon}
                                        tone="base"
                                    />
                                </div>
                            </div>
                            <Divider />
                            <div className="shoping-setting">
                                <div className="shoping-setting-section">
                                    <div className="shoping-setting-section-item">
                                        <div className="shoping-setting-section-item-label">Hotspot color</div>
                                        <div className="shoping-setting-section-item-wrapper">
                                            <div className="color-picker-title">Color</div>
                                            <AppProvider i18n={{}}>
                                                <Popover
                                                    active={popoverActiveHotspotColor}
                                                    activator={
                                                        <div className="color-picker-main" style={{ paddingInlineEnd: "8px" }} onClick={togglePopoverActiveHotspotColor}>
                                                            <div className="color-picker-main-picked">
                                                                <div className="color-picker-main-picked-color" style={{ background: valueHotspotColor }}></div>
                                                                <div className="color-picker-main-picked-hex">{valueHotspotColor}</div>
                                                            </div>
                                                        </div>
                                                    }
                                                    onClose={togglePopoverActiveHotspotColor}
                                                    autofocusTarget="first-node"
                                                >
                                                    <div style={{ padding: "16px" }}>
                                                        <ColorPicker onChange={setColorHotspotColor} color={colorHotspotColor} />
                                                        <div style={{ marginBlockStart: "16px" }}>
                                                            <TextField
                                                                value={valueHotspotColor}
                                                                onChange={handleChangeInputValueColor}
                                                                autoComplete="off"
                                                            />
                                                        </div>
                                                    </div>
                                                </Popover>
                                            </AppProvider>
                                        </div>
                                    </div>
                                    <div className="shoping-setting-section-item">
                                        <div className="shoping-setting-section-item-label">Hotspot hover</div>
                                        <div className="shoping-setting-section-item-wrapper">
                                            <div className="color-picker-title">Color</div>
                                            <AppProvider i18n={{}}>
                                                <Popover
                                                    active={popoverActiveHotspotHover}
                                                    activator={
                                                        <div className="color-picker-main" onClick={togglePopoverActiveHotspotHover}>
                                                            <div className="color-picker-main-picked" style={{ minWidth: "100px" }}>
                                                                <div className="color-picker-main-picked-color" style={{ background: valueHotspotHover }}></div>
                                                                <div className="color-picker-main-picked-hex">{valueHotspotHover}</div>
                                                            </div>
                                                            <div className="color-picker-main-picked-alpha">{valueHotspotHoverAlpha}%</div>
                                                        </div>
                                                    }
                                                    onClose={togglePopoverActiveHotspotHover}
                                                    autofocusTarget="first-node"
                                                >
                                                    <div style={{ padding: "16px" }}>
                                                        <ColorPicker onChange={setColorHotspotHover} color={colorHotspotHover} allowAlpha />
                                                        <div className="color-picker-input" style={{ marginBlockStart: "16px", display: "flex", maxWidth: "224px" }}>
                                                            <div className="color-picker-input-hex">
                                                                <TextField
                                                                    value={valueHotspotHover}
                                                                    onChange={handleChangeInputValueHotspotHover}
                                                                    autoComplete="off"

                                                                />
                                                            </div>
                                                            <div className="color-picker-input-alpha" style={{ width: "150px", marginInlineStart: "8px" }}>
                                                                <TextField
                                                                    autoSize
                                                                    suffix={<div>%</div>}
                                                                    type="number"
                                                                    value={valueHotspotHoverAlpha} // Giá trị alpha dưới dạng %
                                                                    onChange={handleChangeInputValueHotspotHoverAlpha}
                                                                    autoComplete="off"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ marginBlockStart: "8px" }}>
                                                            <Checkbox
                                                                label="Make transparent"
                                                                checked={checkedAlpha}
                                                                onChange={handleChangeCheckedAlpha}
                                                            />
                                                        </div>
                                                    </div>
                                                </Popover>
                                            </AppProvider>
                                        </div>
                                    </div>
                                </div>
                                <div className="shoping-setting-section">
                                    <div className="shoping-setting-section-item">
                                        <div className="shoping-setting-section-item-label">Hotspot link</div>
                                        <div style={{ marginInlineStart: "8px" }}>
                                            <ChoiceList
                                                choices={[
                                                    { label: 'Open in new tab', value: 'newTab' },
                                                    { label: 'Open in same tab', value: 'sameTab' },
                                                ]}
                                                selected={selectedOpenTab}
                                                onChange={handleChangeOpenTab}
                                            />
                                        </div>
                                    </div>
                                    <div className="shoping-setting-section-item">
                                        <div className="shoping-setting-section-item-label">Display product item</div>
                                        <div style={{ marginInlineStart: "8px" }}>
                                            <ChoiceList
                                                choices={[
                                                    { label: 'Vertical view', value: 'vertical' },
                                                    { label: 'Horizontal view', value: 'horizontal' },
                                                ]}
                                                selected={selectedOpenTab}
                                                onChange={handleChangeOpenTab}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="shoping-setting-section">
                                    <div className="shoping-setting-section-item">

                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            default:
                return (
                    <div>
                        <Text variant="headingMd" as="h6">
                            Configuration
                        </Text>
                        <Divider />
                        <div className="widget-setting">
                            {/* Các mục cấu hình ban đầu */}
                        </div>
                    </div>
                );
        }
    };


    // State tabs
    const [selected, setSelected] = useState(0);
    // State để quản lý Popover được mở
    const [activePopoverId, setActivePopoverId] = useState(null);
    // Hàm mở Popover cho một dòng cụ thể
    const openPopover = (id) => setActivePopoverId(id);
    // Hàm đóng Popover
    const closePopover = () => setActivePopoverId(null);
    //Định nghĩa các tabs
    const tabs = [
        { id: "all", content: "All", panelID: "all-widget" },
        { id: "active-widget", content: "Active", panelID: "active-widget" },
        { id: "paused-widget", content: "Paused", panelID: "paused-widget" },
    ];
    //Hàm chuyển tabs bằng việc thay đổi chỉ số 
    const handleTabChange = useCallback((selectedTabIndex) => setSelected(selectedTabIndex), []);
    const allWidget = widget?.map((wid, index) => ({
        id: index || 0,
        name: wid.widgetName || "",
        type: "IG Feed",
        gallery: wid.gallary || "",
        status: "Activated",
        update: "December 16, 2024 03:35",
    }))

    //Định nghĩa widget active và paused
    const activeWidget = allWidget.filter((widget) => widget.status === "Activated");
    const pausedWidget = allWidget.filter((widget) => widget.status === "Paused");
    //Tạo mảng table cho tabs
    const tableData = [allWidget, activeWidget, pausedWidget];
    //Đặt tên cho bảng
    const resourceName = { singular: "order", plural: "orders" };
    //Hàm mặc định chọn dòng của bảng và lưu chỉ số dòng được chọn vào biến selectedResources
    const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } = useIndexResourceState(tableData[selected]);
    //Tạo biến đối chiếu cho từng dòng trong bảng
    const rowMarkup = tableData[selected].map(({ id, name, type, gallery, status, update }, index) => {
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
                onClick={() => {
                    setActiveStep1(0); shopify.modal.show('my-modal');
                    navigate(`?id=${id}`);
                    setCurrentIdWidget(id);
                    defaultForm(id);
                    resetForm(id);
                    setPreviewShoping(true)
                }}
                id={id}
                key={id}
                selected={selectedResources.includes(id)}
                position={index}
            >
                <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                        {name}
                    </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{type}</IndexTable.Cell>
                <IndexTable.Cell>{gallery}</IndexTable.Cell>
                <IndexTable.Cell>
                    <Badge tone={status === "Activated" ? "success" : "default"} >
                        {status}
                    </Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Text >{update}</Text>
                </IndexTable.Cell>
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
    });
    //Định nghĩa chức năng của button khi chọn dòng
    const promotedBulkActionsActive = [
        { content: "Active", onAction: () => console.log("Todo: implement bulk edit"), },
        { content: "Paused", onAction: () => console.log("Todo: implement bulk edit") },
        { content: "Delete", onAction: () => { shopify.modal.show('modal-confirm-delete') }, destructive: true },
    ];

    //Hàm hiển thị hình ảnh theo kích thước chỉnh sửa
    const renderGrid = (rows, columns, border, padding) => {
        const grid = [];
        let lengthImgApi = 0;

        // Chuyển đổi border và padding sang chuỗi và thêm "px"
        const borderPx = `${border}px`;
        const paddingPx = `${padding}px`;

        for (let i = 0; i < rows; i++) {
            const row = (
                <div className="preview-feed-container-row" key={`row-${i}`}>
                    {Array.from({ length: columns }).map((_, j) => {
                        // Lấy ảnh từ API hoặc sử dụng ảnh mặc định nếu hết ảnh
                        const imageUrl = lengthImgApi < posts.media?.data.length
                            ? posts.media.data[lengthImgApi].media_url
                            : "https://widget.onecommerce.io/assets/default-image-CZufZ3kG.svg";

                        // Tăng lengthImgApi sau khi sử dụng ảnh
                        lengthImgApi++;

                        return (
                            <div
                                className="preview-feed-container-row-item"
                                key={`row-${i}-col-${j}`}
                                style={{
                                    borderRadius: borderPx,
                                    margin: paddingPx
                                }}
                            >
                                <div className="preview-feed-container-row-item-img">
                                    <img
                                        src={imageUrl}
                                        alt=""
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
            grid.push(row);
        }
        return grid;
    }


    //Xử lý stepper
    const [activeStep1, setActiveStep1] = useState(0); // Step mặc định
    const steps2 = [
        {
            title: "Choose gallery",
            content: <p>Nội dung của bước 1</p>,
        },
        {
            title: "Customize widget",
            content: <p>Nội dung của bước 2</p>,
        },
        {
            title: "Install",
            content: <p>Nội dung của bước 3</p>,
        },
    ];
    const handleNext1 = () => {
        if (textFieldValue === '') {
            setShowError(true); // Hiển thị lỗi nếu trường bị bỏ trống
            return;
        } else if (activeStep1 < 2) {
            setActiveStep1(activeStep1 + 1)
        }
    };

    const handleBack1 = () => {
        if (activeStep1 > 0) {
            setActiveStep1(activeStep1 - 1)
        }
    };
    //Xử lý preview
    const [activeStepPreview, setActiveStepPreview] = useState(0); // Step mặc định
    const stepsPreview = [
        {
            title: "Desktop",
            icon: <Icon
                source={DesktopIcon}
                tone="base"
            />
        },
        {
            title: "Mobile",
            icon: <Icon
                source={MobileIcon}
                tone="base"
            />
        }
    ];

    return (
        <>
            <Page fullWidth title="All widget" primaryAction={<Button icon={PlusIcon} variant="primary" onClick={() => { setActiveStep1(0); shopify.modal.show('my-modal'); emptyForm(); navigate('?new'); setPreviewShoping(true) }}>Create widget</Button>}>
                <LegacyCard>
                    <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} >
                        <LegacyCard.Section>
                            <IndexTable

                                resourceName={resourceName}
                                itemCount={tableData[selected].length}
                                selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                                onSelectionChange={handleSelectionChange}
                                headings={[
                                    { title: "Name" },
                                    { title: "Type" },
                                    { title: "From gallery" },
                                    { title: "Status" },
                                    { title: "Last Updated" },
                                    { title: "Action" },
                                ]}
                                promotedBulkActions={promotedBulkActionsActive}
                            >
                                {rowMarkup}
                            </IndexTable>
                        </LegacyCard.Section>
                    </Tabs>
                </LegacyCard>
            </Page>

            <Modal id="my-modal" variant="max">
                <TitleBar title="SocialWidget">
                </TitleBar>
                <SaveBar id="my-save-bar">
                    <button variant="primary" onClick={() => {
                        if (textFieldValue === '') {
                            setShowError(true); // Hiển thị lỗi nếu trường bị bỏ trống
                            return;
                        } else {
                            handleSave(modalId)
                        }
                    }}></button>
                    <button onClick={() => handleDiscard()}></button>
                </SaveBar>

                <div className="modal-1" style={{ padding: "0 16px" }}>
                    <div className="modal-header" style={{ width: '100%' }}>
                        <InlineStack blockAlign="center" align="space-between" >
                            <Box padding="400">
                                <Text variant="headingMd" as="h5" fontWeight="bold">
                                    Edit Widget
                                </Text>
                            </Box>
                            <Box >
                                <InlineStack gap="150">
                                    <Box>
                                        <Text>Preview</Text>
                                    </Box>
                                    <Box width="">
                                        <div className="tab-select-container">
                                            {stepsPreview.map((step, index) => (
                                                <div
                                                    key={index}
                                                    className={`tab-select-item ${activeStepPreview === index ? "is-active" : ""}`}
                                                    onClick={() => setActiveStepPreview(index)}
                                                >
                                                    <div className="tab-select-item-name">
                                                        <div className="tab-select-item-icon">
                                                            {step.icon}
                                                        </div>
                                                        {step.title}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Box>
                                </InlineStack>
                            </Box>
                        </InlineStack>
                    </div>

                    <div className="modal-content">
                        <div className="configs-page-content-main-aside">
                            <div className="configs-page-content-main-aside-inside">
                                {currentView === 'default' ? (
                                    <div className="modal-content-setting">
                                        <div className="modal-content-setting-header">
                                            <div className="tab-select-container">
                                                {steps2.map((step, index) => (
                                                    <div
                                                        key={index}
                                                        className={`tab-select-item ${activeStep1 === index ? "is-active" : ""}`}
                                                        onClick={() => {
                                                            if (textFieldValue === '') {
                                                                setShowError(true); // Hiển thị lỗi nếu trường bị bỏ trống
                                                                return;
                                                            } else { setActiveStep1(index); }
                                                        }}
                                                    >
                                                        <div className="tab-select-item-name">
                                                            <div className="tab-select-item-icon">
                                                                {activeStep1 > index ? (
                                                                    <Icon source={CheckSmallIcon} tone="base" />
                                                                ) : (
                                                                    index + 1
                                                                )}
                                                            </div>
                                                            {step.title}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <Scrollable style={{ height: 'calc(100vh - 167px)' }}>
                                            {getStepContent(activeStep1)}
                                        </Scrollable>

                                        <div className="modal-content-setting-footer">
                                            <div className="modal-content-setting-footer-prev">
                                                {/* Ẩn nút Back nếu activeStep = 0 */}
                                                {activeStep1 > 0 && activeStep1 === 1 && (
                                                    <Button onClick={handleBack1}>Back</Button>
                                                )}
                                            </div>
                                            <div className="modal-content-setting-footer-next">
                                                {/* Thay đổi nội dung nút dựa trên activeStep */}
                                                {activeStep1 === 1 ? (
                                                    <Button loading={fetcher.state === "submitting"} disabled={isLoaded} onClick={() => handleSave(modalId)} variant="primary">
                                                        Save
                                                    </Button>
                                                ) : activeStep1 === 2 ? (
                                                    <Button variant="primary" onClick={() => shopify.modal.show('modal-confirm')}>
                                                        Done
                                                    </Button>
                                                ) : (
                                                    <Button variant="primary" onClick={handleNext1}>
                                                        Next
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    renderSideTabContent()
                                )}
                            </div>
                        </div>

                        <div className="preview-feed">
                            {getPreviewContent(activeStepPreview)}
                        </div>

                    </div>
                </div>
            </Modal>

            <Modal id="modal-confirm">
                <Box padding='400'>
                    <p>Leaving this page will delete all unsaved changes.</p>
                </Box>
                <TitleBar title="Leave page with unsaved changes?">
                    <button onClick={() => { shopify.modal.hide('modal-confirm'); shopify.modal.hide('my-modal') }} tone="critical" variant="primary">Leave page</button>
                    <button onClick={() => shopify.modal.hide('modal-confirm')}>Stay</button>
                </TitleBar>
            </Modal>

            <Modal id="modal-confirm-delete">
                <Box padding='400'>
                    <p>This can't be undone.</p>
                </Box>
                <TitleBar title="Delete selected widget(s)?">
                    <button loading={(fetcher.state === "submitting") ? ("true") : undefined} onClick={() => { handleDeleteSetting(selectedResources); clearSelection() }} tone="critical" variant="primary">Confirm</button>
                    <button disabled={false} onClick={() => shopify.modal.hide('modal-confirm-delete')}>Cancel</button>
                </TitleBar>
            </Modal>
        </>
    );
}

