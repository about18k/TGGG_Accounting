import React from "react";
import MaterialRequest from "./MaterialRequest";

const EngineerHub = ({ user, onNavigate }) => {
    return (
        <MaterialRequest user={user} onNavigate={onNavigate} />
    );
};

export default EngineerHub;
