import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import Layout from "./components/Layout/Layout";
import LecturerRoute from "./components/Auth/LecturerRoute";
import AnswerUnansweredQuestions from "./components/Rabbies/AnswerUnasweredQuestions";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import SeminariesPage from "./pages/SeminariesPage";
import QAPage from "./pages/QAPage";
import AskRabbiPage from "./pages/AskRabbiPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import RegisterPage from "./pages/RegisterPage";
import LecturerSeminariesPage from "./pages/LecturerSeminariesPage";
import LecturerSeminaryStudentsPage from "./pages/LecturerSeminaryStudentsPage";
import ManagerRoute from "./components/Auth/ManagerRoute";
import ManagerLecturersPage from "./pages/ManagerLecturersPage";
import ManagerSeminariesPage from "./pages/ManagerSeminariesPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/seminaries" element={<SeminariesPage />} />
            <Route path="/qa" element={<QAPage />} />
            <Route path="/ask-rabbi" element={<AskRabbiPage />} />
            <Route
              path="/lecturer/questions"
              element={
                <LecturerRoute>
                  <AnswerUnansweredQuestions />
                </LecturerRoute>
              }
            />
            <Route
              path="/lecturer/seminaries"
              element={
                <LecturerRoute>
                  <LecturerSeminariesPage />
                </LecturerRoute>
              }
            />
            <Route
              path="/lecturer/students"
              element={
                <LecturerRoute>
                  <LecturerSeminaryStudentsPage />
                </LecturerRoute>
              }
            />
            <Route
              path="/manager/lecturers"
              element={
                <ManagerRoute>
                  <ManagerLecturersPage />
                </ManagerRoute>
              }
            />
            <Route
              path="/manager/seminaries"
              element={
                <ManagerRoute>
                  <ManagerSeminariesPage />
                </ManagerRoute>
              }
            />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
