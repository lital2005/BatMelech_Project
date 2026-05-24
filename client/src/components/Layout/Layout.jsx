import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../Navbar/Navbar";

export default function Layout() {
  return (
    <div className="appLayout" dir="rtl">
      <Navbar />
      <main className="appLayout__main">
        <Outlet />
      </main>
    </div>
  );
}

