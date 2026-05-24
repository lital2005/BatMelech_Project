import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function LecturerRoute({ children }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (user?.status !== "lecturer") {
    return <Navigate to="/" replace />;
  }

  const accountStatus = user?.accountStatus ?? "approved";
  if (accountStatus === "pending") {
    return <Navigate to="/pending-approval" replace />;
  }
  if (accountStatus === "rejected") {
    return <Navigate to="/" replace />;
  }

  return children;
}

