import AdminNavigationBar from "../../components/navbars/AdminNavigationBar";
import { Navigate, Outlet } from "react-router-dom";
import React from "react";
import { isAuth } from "../../helpers/Auth";

/**
 * @description Handles admin pages for the application
 */
export default function IndexAdmin() {
  return isAuth().role === "admin" ? (
    <>
      <AdminNavigationBar />
      <div className="mt-16 font-Montserrat">
        <Outlet />
      </div>
    </>
  ) : (
    <Navigate to="/unauthorized-access" />
  );
}
