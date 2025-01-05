/* eslint-disable no-loop-func */

import React, { useState, useCallback, useEffect } from "react";
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
    Layout,
    TextField,
    Select,
    Scrollable,
    Divider,
    RangeSlider,
    EmptyState,
    IndexFilters
} from "@shopify/polaris";

// import { accessTokenCookie } from "../createCookie";
import { MenuVerticalIcon, ChevronRightIcon, XIcon, CheckSmallIcon, DesktopIcon, MobileIcon } from "@shopify/polaris-icons";
import { Modal, TitleBar, useAppBridge, SaveBar } from '@shopify/app-bridge-react';
import styles from '../style/style-widget.css?url'
import axios from 'axios';
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate, useSearchParams, useFetcher } from "@remix-run/react";
import db from "../db.server";
import { authenticate } from "../shopify.server";



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
        where: { accountId: account?.id }
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
            return json({ posts, accountName, widget });

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
        //Kiểm tra nếu widgetId được gửi lên là undefine thì đặt giá trị = 0
        const widgetId = formData?.widgetId && !isNaN(parseInt(formData.widgetId, 10))
            ? parseInt(formData.widgetId, 10)
            : 0; // Giá trị mặc định
        console.log('widgetId: ', widgetId);
        const widgetName = formData?.widgetName?.toString() ?? "";
        const gallary = formData?.gallary?.toString() ?? "";
        const widgetTemplate = formData?.widgetTemplate?.toString() ?? "";
        const numberOfColumns = parseInt(formData?.numberOfColumns?.toString() ?? "1", 10);
        const numberOfRows = parseInt(formData?.numberOfRows?.toString() ?? "1", 10);
        const accountName = formData?.accountName?.toString() ?? "";
        const borderImg = parseInt(formData?.borderImg?.toString() ?? "1", 10);
        const paddingImg = parseInt(formData?.paddingImg?.toString() ?? "1", 10);

        const widgetIds = formData?.ids?.split(',').map(Number) // Chuyển 1 chuỗi số cách nhau bằng dấu , thành Int[]

        //Tìm metafield đã tồn tại
        const metafield = await admin.rest.resources.Metafield.all({
            session,
            namespace: "instagram",
            key: "setting"
        });
        //Tạo mảng chứa các đối tượng setting trong metafield
        let currentSettings = [];
        try {
            // Parse giá trị từ Metafield, đảm bảo thành mảng
            const parsedValue = JSON.parse(metafield.data[0]?.value || "[]");
            if (Array.isArray(parsedValue)) {
                currentSettings = parsedValue;
            } else {
                console.warn("Parsed value is not an array, resetting to empty array.");
                currentSettings = [];
            }
        } catch (error) {
            console.error("Error parsing Metafield value:", error);
            currentSettings = [];
        }
        console.log("Current settings before update:", currentSettings);

        if (actionType === "create") {

            //Tìm account ứng với setting cần lưu
            const accountForSetting = await db.account.findFirst({
                where: { accountName: accountName },
            });
            // console.log('accountForSetting: ', accountForSetting);

            //tìm xem có bản ghi nào trước đó trong database chưa
            const existingSetting = await db.widgetSetting.findFirst({
                where: { id: widgetId },
            });
            console.log('existingSetting: ', existingSetting);

            // Sử dụng upsert để tạo mới hoặc cập nhật dựa trên sessionId
            if (existingSetting) {
                // Kiểm tra trùng lặp trong database
                const existsInDatabase = await db.widgetSetting.findFirst({
                    where: { widgetName: widgetName },
                });

                if (existsInDatabase) {
                    console.log("Setting with this widgetName already exists in database, skipping:", widgetName);
                    return json({
                        success: false,
                        message: `Setting with widgetName "${widgetName}" already exists in database.`,
                    }, { status: 409 }); // Conflict status
                }

                // Tiêu chí tìm setting cần cập nhật (ví dụ: widgetName)
                const targetWidgetName = await db.widgetSetting.findUnique({
                    where: {
                        id: existingSetting?.id
                    }
                }); // Thay bằng tên hoặc ID cụ thể bạn muốn cập nhật

                // Dữ liệu mới để cập nhật
                const updatedSettingMetafield = {
                    widgetName: widgetName,
                    gallary: gallary,
                    widgetTemplate: widgetTemplate,
                    numberOfColumns: numberOfColumns,
                    numberOfRows: numberOfRows,
                    paddingImg: paddingImg,
                    borderImg: borderImg
                };

                // Tìm và cập nhật setting trong mảng
                const indexToUpdate = currentSettings.findIndex(
                    (setting) => setting.widgetName === targetWidgetName.widgetName
                );

                if (indexToUpdate !== -1) {
                    // Cập nhật setting
                    currentSettings[indexToUpdate] = { ...currentSettings[indexToUpdate], ...updatedSettingMetafield };
                    console.log("Setting updated successfully:", currentSettings[indexToUpdate]);
                } else {
                    console.warn("Setting not found, no update performed.");
                }

                // Lưu lại Metafield
                const newMetafield = new admin.rest.resources.Metafield({ session });
                newMetafield.namespace = "instagram";
                newMetafield.key = "setting";
                newMetafield.value = JSON.stringify(currentSettings);
                newMetafield.type = "json";

                try {
                    await newMetafield.save({ update: true });
                    console.log("Metafield saved successfully with updated settings:", newMetafield);
                } catch (error) {
                    console.error("Error saving updated Metafield:", error);
                }
                
                // Nếu đã tồn tại, cập nhật bản ghi hiện tại
                const updatedSetting = await db.widgetSetting.update({
                    where: { id: existingSetting?.id }, // Cập nhật bằng id (unique)
                    data: {
                        widgetName: widgetName,
                        gallary: gallary,
                        widgetTemplate: widgetTemplate,
                        numberOfColumns: numberOfColumns,
                        numberOfRows: numberOfRows,
                        paddingImg: paddingImg,
                        borderImg: borderImg
                    },
                });
                console.log("Update successfull!", updatedSetting);
                return json({
                    success: true,
                    message: "Widget updated successfully."
                }, { status: 200 });
            } else {
                // Tạo setting mới
                const newSettingMetafield = {
                    widgetName,
                    gallary,
                    widgetTemplate,
                    numberOfColumns,
                    numberOfRows,
                    borderImg,
                    paddingImg,
                };

                // Kiểm tra và thêm setting mới nếu chưa tồn tại
                const exists = currentSettings.some(
                    (setting) => setting.widgetName === newSettingMetafield.widgetName
                );

                if (!exists) {
                    currentSettings.push(newSettingMetafield);
                    console.log("New setting added:", newSettingMetafield);
                } else {
                    console.log("Setting already exists, skipping:", newSettingMetafield);
                }

                // Lưu lại Metafield
                const newMetafield = new admin.rest.resources.Metafield({ session });
                newMetafield.namespace = "instagram";
                newMetafield.key = "setting";
                newMetafield.value = JSON.stringify(currentSettings);
                newMetafield.type = "json";

                try {
                    await newMetafield.save({ update: true });
                    console.log("Metafield saved successfully:", newMetafield);
                } catch (error) {
                    console.error("Error saving Metafield:", error);
                }
                
                // Kiểm tra trùng lặp trong database
                const existsInDatabase = await db.widgetSetting.findFirst({
                    where: { widgetName: widgetName },
                });

                if (existsInDatabase) {
                    console.log("Setting with this widgetName already exists in database, skipping:", widgetName);
                    return json({
                        success: false,
                        message: `Setting with widgetName "${widgetName}" already exists in database.`,
                    }, { status: 409 }); // Conflict status
                }

                // Nếu không tồn tại, tạo mới
                const newSetting = await db.widgetSetting.create({
                    data: {
                        widgetName: widgetName,
                        gallary: gallary,
                        widgetTemplate: widgetTemplate,
                        numberOfColumns: numberOfColumns,
                        numberOfRows: numberOfRows,
                        paddingImg: paddingImg,
                        borderImg: borderImg,
                        accountId: accountForSetting.id
                    },
                });
                //update 
                console.log("Create successfull!", newSetting);
            }
            // Trả về kết quả thành công
            return json({
                success: true,
                message: "Widget created successfully."
            }, { status: 201 });
        } else if (actionType === 'delete') {
            // Lấy danh sách tên của các widget từ database theo widgetIds
            const widgetsToDelete = await db.widgetSetting.findMany({
                where: {
                    id: { in: widgetIds }
                },
                select: { widgetName: true } // Chỉ lấy tên của các widget
            });

            // Lấy danh sách tên widget cần xóa
            const namesToDelete = widgetsToDelete.map(widget => widget.widgetName);
            console.log('Tên các widget cần xóa:', namesToDelete);

            // Lọc currentSettings để loại bỏ các đối tượng có tên trong danh sách tên cần xóa
            currentSettings = currentSettings.filter(
                setting => !namesToDelete.includes(setting.widgetName)
            );
            console.log('currentSettings sau khi xóa:', currentSettings);

            // Lưu lại Metafield
            const deleteMetafield = new admin.rest.resources.Metafield({ session });
            deleteMetafield.namespace = "instagram";
            deleteMetafield.key = "setting";
            deleteMetafield.value = JSON.stringify(currentSettings)
            deleteMetafield.type = "json";
            // Lưu Metafield mới
            await deleteMetafield.save({ update: true });
            console.log("Xóa Metafield thành công.", deleteMetafield);

            // Xóa bản ghi khỏi database
            const deletedRecord = await db.widgetSetting.deleteMany({
                where: {
                    id: {
                        in: widgetIds
                    }
                }
            });
            console.log('Bản ghi đã bị xóa:', deletedRecord);
            // Trả về kết quả thành công
            return json({
                success: true,
                message: `${deletedRecord.count} widgets deleted successfully.`
            }, { status: 200 });
        } else {
            return json({ error: "Unknown action type." }, { status: 400 });
        }
    } catch (error) {
        console.error("Cannot load database!", error);
        return json({ error: "Internal server error." }, { status: 500 });
    }
}

export default function TabsWithTablesExample() {
    //Load data từ loader
    const loaderData = useLoaderData()
    const posts = loaderData?.posts || [] // Biến lưu thông tin bài viết
    const widget = loaderData?.widget || [] // Biến lưu thông tin mảng setting
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
    const [textFieldValue, setTextFieldValue] = useState(widget[0]?.widgetName || '');
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
    const [selectedSelect, setSelectedSelect] = useState(widget[0]?.gallary || 'default');
    const handleSelectChange = useCallback(
        (value) => {
            setSelectedSelect(value);
        },
        [],
    );
    //Xử lý setting layout số cột
    const [rangeValueColumn, setRangeValueColumn] = useState(widget[0]?.numberOfColumns || 4);
    const handleRangeSliderChangeColumn = useCallback(
        (value) => setRangeValueColumn(value),
        [],
    );
    //Xử lý setting layout số dòng
    const [rangeValueRow, setRangeValueRow] = useState(widget[0]?.numberOfRows || 2);
    const handleRangeSliderChangeRow = useCallback(
        (value) => setRangeValueRow(value),
        [],
    );
    //Xử lý setting layout padding lẫn nhau
    const [rangeValuePadding, setRangeValuePadding] = useState(widget[0]?.paddingImg || 1);
    const handleRangeSliderChangePadding = useCallback(
        (value) => setRangeValuePadding(value),
        [],
    );
    //Xử lý setting layout boder của hình ảnh
    const [rangeValueBorder, setRangeValueBorder] = useState(widget[0]?.borderImg || 1);
    const handleRangeSliderChangeBorder = useCallback(
        (value) => setRangeValueBorder(value),
        [],
    );
    //Xử lý khi có thay đổi setting
    const isFormChanged = (id) => {
        const formValues = defaultForm(id); // Gọi hàm và lưu kết quả vào biến
        return (
            textFieldValue !== formValues.widgetName ||
            selectedSelect !== formValues.gallery ||
            rangeValueColumn !== formValues.rangeValueColumn ||
            rangeValueRow !== formValues.rangeValueRow ||
            rangeValueBorder !== formValues.rangeValueBorder ||
            rangeValuePadding !== formValues.rangeValuePadding
        )
    }

    const defaultForm = (index) => ({
        widgetName: widget[index]?.widgetName || '',
        gallery: widget[index]?.gallary || 'default',
        rangeValueColumn: widget[index]?.numberOfColumns || 4,
        rangeValueRow: widget[index]?.numberOfRows || 2,
        rangeValuePadding: widget[index]?.paddingImg || 1,
        rangeValueBorder: widget[index]?.borderImg || 1,
    });
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
    }
    //useEffect để loading xong
    useEffect(() => {
        shopify.loading(false);
    }, []);

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
                                        { label: posts?.username, value: posts?.username },
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
                        <div className="widget-setting-item">
                            <div className="widget-setting-item-label">Heading settings</div>
                            <div>
                                <Icon
                                    source={ChevronRightIcon}
                                    tone="base"
                                />
                            </div>
                        </div>
                        <div className="widget-setting-item">
                            <div className="widget-setting-item-label">Item settings</div>
                            <div>
                                <Icon
                                    source={ChevronRightIcon}
                                    tone="base"
                                />
                            </div>
                        </div>
                        <div className="widget-setting-item">
                            <div className="widget-setting-item-label">Popup settings</div>
                            <div>
                                <Icon
                                    source={ChevronRightIcon}
                                    tone="base"
                                />
                            </div>
                        </div>
                        <div className="widget-setting-item">
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
    const getPreviewContent = (chose) => {
        switch (chose) {
            case 0:
                return <>
                    <div className="preview-feed-container-desktop">
                        <div className="preview-feed-bar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="68" height="12" viewBox="0 0 68 12" fill="none"><ellipse cx="7.43835" cy="6" rx="6.6361" ry="6" fill="#FFE5E6"></ellipse><ellipse cx="34.5362" cy="6" rx="6.08309" ry="6" fill="#FFF0BF"></ellipse><ellipse cx="61.0802" cy="6" rx="6.08309" ry="6" fill="#C2F2D8"></ellipse></svg>
                        </div>
                        <Scrollable style={{ height: '550px' }}>
                            {renderGrid(rangeValueRow, rangeValueColumn, rangeValueBorder, rangeValuePadding)}
                        </Scrollable>
                    </div>
                </>
            case 1:
                return <>
                    <Scrollable style={{ height: '550px' }}>
                        <div className="preview-feed-container">
                            <div className="preview-feed-container-mobile">
                                <img src="https://widget.onecommerce.io/assets/phone-frame-DW58YU6i.svg" alt="" />
                                <div style={{ height: '100%', overflow: 'hidden auto' }}></div>
                            </div>
                        </div>
                    </Scrollable>
                </>
            default:
                return
        }
    }

    const [selectedLayout, setSelectedLayout] = useState(null);

    const handleSelect = (index) => {
        setSelectedLayout(index);
    };

    //Hàm sử lý giao diện khi Setting layout
    const renderSideTabContent = () => {
        switch (currentView) {
            case 'layoutSettings':
                return (
                    <div>
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
                        </div>
                    </div>
                );
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
            <IndexTable.Row onClick={() => { setActiveStep1(0); shopify.modal.show('my-modal'); navigate(`?id=${id}`); setCurrentIdWidget(id); defaultForm(id); resetForm(id) }} id={id} key={id} selected={selectedResources.includes(id)} position={index}>
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
    };

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
            <Page fullWidth title="All widget" primaryAction={<Button variant="primary" onClick={() => { setActiveStep1(0); shopify.modal.show('my-modal'); emptyForm(); navigate('?new') }}>Create widget</Button>}>
                <LegacyCard>
                    <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} >
                        <LegacyCard.Section>
                            <IndexTable
                                // fetcher.state === "submitting"
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
                <div className="modal" style={{ padding: "0 16px" }}>
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
                        <Layout>
                            <Layout.Section variant="oneThird">
                                <LegacyCard sectioned>
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
                                            <Divider />
                                            <Scrollable style={{ height: '480.4px' }}>
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

                                </LegacyCard>
                            </Layout.Section>

                            <Layout.Section >
                                <LegacyCard sectioned>
                                    <div className="preview-feed">
                                        {getPreviewContent(activeStepPreview)}
                                    </div>
                                </LegacyCard>
                            </Layout.Section>
                        </Layout>
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
                    <button loading={fetcher.state === "submitting" && 'true'} onClick={() => { handleDeleteSetting(selectedResources); clearSelection() }} tone="critical" variant="primary">Confirm</button>
                    <button onClick={() => shopify.modal.hide('modal-confirm-delete')}>Cancel</button>
                </TitleBar>
            </Modal>
        </>
    );
}

