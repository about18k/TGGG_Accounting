import React from "react";
import MaterialRequest from "../SiteEngineer_Dashboard/MaterialRequest";

const CoordinatorHub = ({ user, onNavigate }) => {
  return (
    <div className="w-full relative animate-fade-in space-y-6">

      


            <MaterialRequest user={user} onNavigate={onNavigate} />

    </div>
  );
};

export default CoordinatorHub;
