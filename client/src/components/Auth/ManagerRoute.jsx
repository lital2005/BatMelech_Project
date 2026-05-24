import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function ManagerRoute({ children }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (user?.status !== "manager") {
    return <Navigate to="/" replace />;
  }

  return children;
}
