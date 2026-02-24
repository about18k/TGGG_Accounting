import React from "react";
import MaterialRequest from "./MaterialRequest";

const CoordinatorHub = ({ user, onNavigate }) => {
  return (
    <MaterialRequest user={user} onNavigate={onNavigate} />
  );
};

export default CoordinatorHub;
