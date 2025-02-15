import React, { useState } from "react";

function Switch({
    initialState = false,
    onToggle = () => {},
}) {
    const [isChecked, setIsChecked] = useState(initialState);

    const handleToggle = () => {
        const newState = !isChecked;
        setIsChecked(newState);
        onToggle(newState); // Gọi callback khi trạng thái thay đổi
    };

    const switchStyles = {
        background: "rgba(0, 0, 0, 0.25)",
        opacity: 1,
    }
    const switchCheckedStyles = {
        background: "var(--p-color-bg-fill-brand-active)",
        opacity: 1,
    }
    const checkStyles = {
        left: "4px",
        transform: "translateX(0%)"
    }
    const checkCheckedStyles = {
        left: "calc(100% - 4px)",
        transform: "translateX(-100%)"
    }

    return (
        <div
            className="custom-switch"
            style={isChecked ? { ...switchStyles, ...switchCheckedStyles } : switchStyles}
            onClick={handleToggle}
        >
            <div
                className="custom-switch__check"
                style={isChecked ? { ...checkStyles, ...checkCheckedStyles } : checkStyles}
            ></div>
        </div>
    );
}

export default Switch;
