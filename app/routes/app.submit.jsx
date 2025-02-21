import { json } from "@remix-run/node";
import db from "../db.server";

export const action = async ({ request }) => {
    const formData = await request.formData();
    const actionType = formData.get("_action");
    const type = formData.get("type");
    const idToDelete = parseInt(formData.get("idToDelete"), 10);

    if (actionType === "delete") {
        try {
            switch (type) {
                case "widget":
                    await db.widgetSetting.delete({ where: { id: idToDelete } });
                    break;
                case "gallery":
                    await db.gallery.delete({ where: { id: idToDelete } });
                    break;
                case "source":
                    await db.source.delete({ where: { id: idToDelete } });
                    break;
                default:
                    throw new Error("Unknown type");
            }
            return json({ success: true, message: "Item deleted successfully" });
        } catch (error) {
            console.error("Error deleting item:", error);
            return json({ success: false, message: "Error deleting item" });
        }
    }
    return json({ success: false, message: "Invalid action" });
};