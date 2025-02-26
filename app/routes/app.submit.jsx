import { json } from "@remix-run/node";
import db from "../db.server";

export const action = async ({ request }) => {
    const formData = await request.formData();
    const actionType = formData.get("_action");
    const type = formData.get("type");
    const idToDelete = parseInt(formData.get("idToDelete"), 10);
    // Tìm metafield đã tồn tại
    const metafields = await admin.rest.resources.Metafield.all({
        session,
        namespace: "custom",
        key: "setting_data"
    });

    let currentSettings = { accounts: [] };
    if (metafields.data.length > 0) {
        currentSettings = JSON.parse(metafields.data[0].value);
    }

    if (actionType === "delete") {
        try {
            switch (type) {
                case "widget":
                    await db.widgetSetting.delete({ where: { id: idToDelete } });
                    // Xóa widgetSetting khỏi currentSettings
                    for (let acc of currentSettings.accounts) {
                        for (let src of acc.sources) {
                            for (let gal of src.galleries) {
                                gal.widgetSettings = gal.widgetSettings.filter(setting => !(idToDelete === setting.id));
                            }
                        }
                    }
                    break;
                case "gallery":
                    await db.gallery.delete({ where: { id: idToDelete } });
                    for (let acc of currentSettings.accounts) {
                        for (let src of acc.sources) {
                            src.galleries = src.galleries.filter(gallery => !(idToDelete === gallery.id));
                        }
                    }
                    break;
                case "source":
                    await db.source.delete({ where: { id: idToDelete } });
                    for (let acc of currentSettings.accounts) {
                        acc.sources = acc.sources.filter(source => !(idToDelete === source.id));
                    }
                    break;
                default:
                    throw new Error("Unknown type");
            }
            const newMetafield = new admin.rest.resources.Metafield({ session });
            newMetafield.namespace = "custom";
            newMetafield.key = "setting_data";
            newMetafield.value = JSON.stringify(currentSettings);
            newMetafield.type = "json";

            await newMetafield.save({ update: true });
            return json({ success: true, message: "Item deleted successfully" });
        } catch (error) {
            console.error("Error deleting item:", error);
            return json({ success: false, message: "Error deleting item" });
        }
    }
    return json({ success: false, message: "Invalid action" });
};