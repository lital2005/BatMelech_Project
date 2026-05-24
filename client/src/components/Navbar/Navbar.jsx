import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { managerService, notificationService } from "../../services";
import Avatar from "../Avatar/Avatar";
import BatMelechLogo from "../Brand/BatMelechLogo";
import { NAV_BADGES_REFRESH } from "../../utils/navBadges";
import "./navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const isLecturer = user?.status === "lecturer";
  const isManager = user?.status === "manager";
  const userId = user?._id;

  const [lecturerMsgCount, setLecturerMsgCount] = useState(0);
  const [pendingLecturers, setPendingLecturers] = useState(0);
  const [pendingSeminaries, setPendingSeminaries] = useState(0);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setLecturerMsgCount(0);
      setPendingLecturers(0);
      setPendingSeminaries(0);
      return undefined;
    }

    let cancelled = false;

    async function poll() {
      try {
        if (isLecturer && (user?.accountStatus ?? "approved") === "approved") {
          const res = await notificationService.unreadCount(userId);
          if (!cancelled) setLecturerMsgCount(res?.count ?? 0);
        }
        if (isManager) {
          const [lec, sem] = await Promise.all([
            managerService.listPendingLecturers(userId),
            managerService.listPendingSeminaries(userId),
          ]);
          if (!cancelled) {
            setPendingLecturers(Array.isArray(lec) ? lec.length : 0);
            setPendingSeminaries(Array.isArray(sem) ? sem.length : 0);
          }
        }
      } catch {
        /* ignore poll errors */
      }
    }

    poll();
    const t = setInterval(poll, 45000);
    const onRefresh = () => {
      poll();
    };
    window.addEventListener(NAV_BADGES_REFRESH, onRefresh);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener(NAV_BADGES_REFRESH, onRefresh);
    };
  }, [isLoggedIn, userId, isLecturer, isManager, user?.accountStatus]);

  return (
    <header className="nav">
      <div className="nav__inner">
        <div className="nav__left">
          <button
            type="button"
            className="nav__brandBtn"
            onClick={() => navigate("/")}
            aria-label="BatMelech — דף הבית"
            title="BatMelech"
          >
            <BatMelechLogo variant="navIcon" />
          </button>

          <nav className="nav__links" aria-label="ניווט ראשי">
            <NavLink className="nav__link" to="/" end>
              דף הבית
            </NavLink>
            <NavLink className="nav__link" to="/about">
              אודות
            </NavLink>
            <NavLink className="nav__link" to="/seminaries">
              מדרשיות
            </NavLink>
            {!isManager && !isLecturer ? (
              <NavLink className="nav__link" to="/ask-rabbi">
                שאל את הרב
              </NavLink>
            ) : null}
            <NavLink className="nav__link" to="/qa">
              שאלות ותשובות
            </NavLink>

            {isManager ? (
              <>
                <NavLink className="nav__link" to="/manager/lecturers">
                  אישור מרצים
                  {pendingLecturers > 0 ? (
                    <span className="nav__badge" aria-label={`${pendingLecturers} ממתינים`}>
                      {pendingLecturers}
                    </span>
                  ) : null}
                </NavLink>
                <NavLink className="nav__link" to="/manager/seminaries">
                  אישור מדרשיות
                  {pendingSeminaries > 0 ? (
                    <span className="nav__badge" aria-label={`${pendingSeminaries} ממתינות`}>
                      {pendingSeminaries}
                    </span>
                  ) : null}
                </NavLink>
              </>
            ) : null}

            {isLecturer && (user?.accountStatus ?? "approved") === "approved" ? (
              <>
                <NavLink className="nav__link" to="/lecturer/questions">
                  שיחות עם תלמידות
                </NavLink>
                <NavLink className="nav__link" to="/lecturer/seminaries">
                  ניהול מדרשיות
                  {lecturerMsgCount > 0 ? (
                    <span className="nav__badge" aria-label={`${lecturerMsgCount} הודעות`}>
                      {lecturerMsgCount}
                    </span>
                  ) : null}
                </NavLink>
                <NavLink className="nav__link" to="/lecturer/students">
                  ניהול תלמידות
                </NavLink>
              </>
            ) : null}
          </nav>
        </div>

        <div className="nav__right">
          {!isLoggedIn ? (
            <div className="nav__auth">
              <button className="nav__btn nav__btn--primary" onClick={() => navigate("/login")}>
                התחברות
              </button>
            </div>
          ) : (
            <div className="nav__auth">
              <button className="nav__user" onClick={() => navigate("/")}>
                <Avatar user={user} size={32} />
                <span className="nav__userText">
                  {user?.firstName} {user?.lastName}
                </span>
              </button>
              <button className="nav__btn" onClick={logout}>
                התנתקות
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
