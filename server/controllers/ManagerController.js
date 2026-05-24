const User = require("../models/UsersModel");
const Seminary = require("../models/SeminaryModel");
const Notification = require("../models/NotificationModel");
const {
  sendLecturerApprovedEmail,
  sendLecturerRejectedEmail,
  sendSeminaryApprovedEmail,
  sendSeminaryRejectedEmail,
} = require("../services/mailService");

const seminaryPopulates = [
  { path: "createdBy", select: "firstName lastName email status" },
];

async function listPendingLecturers(_req, res) {
  try {
    const rows = await User.find({
      status: "lecturer",
      accountStatus: "pending",
    })
      .select("-password")
      .sort({ createdAt: 1 })
      .lean();
    return res.status(200).send(rows);
  } catch (err) {
    console.error("[listPendingLecturers]", err);
    return res.status(500).send({ message: "שגיאה בטעינת בקשות מרצים" });
  }
}

async function approveLecturer(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.status !== "lecturer") {
      return res.status(404).send({ message: "בקשת מרצה לא נמצאה" });
    }
    if (user.accountStatus !== "pending") {
      return res.status(400).send({ message: "הבקשה כבר טופלה" });
    }

    user.accountStatus = "approved";
    await user.save();

    const name = `${user.firstName} ${user.lastName}`.trim();
    try {
      await sendLecturerApprovedEmail({ to: user.email, userName: name });
    } catch (mailErr) {
      console.error("[approveLecturer] mail failed:", mailErr?.message);
    }

    const safe = await User.findById(user._id).select("-password").lean();
    return res.status(200).send(safe);
  } catch (err) {
    console.error("[approveLecturer]", err);
    return res.status(500).send({ message: "שגיאה באישור המרצה" });
  }
}

async function rejectLecturer(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.status !== "lecturer") {
      return res.status(404).send({ message: "בקשת מרצה לא נמצאה" });
    }
    if (user.accountStatus !== "pending") {
      return res.status(400).send({ message: "הבקשה כבר טופלה" });
    }

    user.accountStatus = "rejected";
    await user.save();

    const name = `${user.firstName} ${user.lastName}`.trim();
    try {
      await sendLecturerRejectedEmail({ to: user.email, userName: name });
    } catch (mailErr) {
      console.error("[rejectLecturer] mail failed:", mailErr?.message);
    }

    const safe = await User.findById(user._id).select("-password").lean();
    return res.status(200).send(safe);
  } catch (err) {
    console.error("[rejectLecturer]", err);
    return res.status(500).send({ message: "שגיאה בדחיית המרצה" });
  }
}

async function listPendingSeminaries(_req, res) {
  try {
    const rows = await Seminary.find({ approvalStatus: "pending" })
      .populate(seminaryPopulates)
      .sort({ createdAt: 1 })
      .lean();
    return res.status(200).send(rows);
  } catch (err) {
    console.error("[listPendingSeminaries]", err);
    return res.status(500).send({ message: "שגיאה בטעינת מדרשיות ממתינות" });
  }
}

async function approveSeminary(req, res) {
  try {
    const seminary = await Seminary.findById(req.params.id).populate("createdBy");
    if (!seminary) {
      return res.status(404).send({ message: "מדרשייה לא נמצאה" });
    }
    if (seminary.approvalStatus !== "pending") {
      return res.status(400).send({ message: "הבקשה כבר טופלה" });
    }

    seminary.approvalStatus = "approved";
    seminary.status = "inactive";
    await seminary.save();

    const creator = seminary.createdBy;
    if (creator?._id) {
      const creatorName = `${creator.firstName} ${creator.lastName}`.trim();
      await Notification.create({
        recipientId: creator._id,
        type: "seminary_approved",
        title: `המדרשייה "${seminary.name}" אושרה`,
        body:
          "המדרשייה אושרה על ידי מנהלת האתר. היכנסי לעמוד «ניהול מדרשיות» ולחצי «פרסם באתר» כדי להפעיל את המדרשייה ולהציג אותה לתלמידות.",
        seminaryId: seminary._id,
      });

      if (creator.email) {
        try {
          await sendSeminaryApprovedEmail({
            to: creator.email,
            userName: creatorName,
            seminaryName: seminary.name,
          });
        } catch (mailErr) {
          console.error("[approveSeminary] mail failed:", mailErr?.message);
        }
      }
    }

    const updated = await Seminary.findById(seminary._id).populate(seminaryPopulates).lean();
    return res.status(200).send(updated);
  } catch (err) {
    console.error("[approveSeminary]", err);
    return res.status(500).send({ message: "שגיאה באישור המדרשייה" });
  }
}

async function rejectSeminary(req, res) {
  try {
    const note = String(req.body?.note ?? "").trim();
    const seminary = await Seminary.findById(req.params.id).populate("createdBy");
    if (!seminary) {
      return res.status(404).send({ message: "מדרשייה לא נמצאה" });
    }
    if (seminary.approvalStatus !== "pending") {
      return res.status(400).send({ message: "הבקשה כבר טופלה" });
    }

    seminary.approvalStatus = "rejected";
    seminary.status = "inactive";
    await seminary.save();

    const creator = seminary.createdBy;
    const bodyText =
      note ||
      "לאחר בדיקה, לא ניתן לאשר כרגע את המדרשייה לפרסום. לפרטים נוספים פני למנהלת האתר.";

    if (creator?._id) {
      const creatorName = `${creator.firstName} ${creator.lastName}`.trim();
      await Notification.create({
        recipientId: creator._id,
        type: "seminary_rejected",
        title: `המדרשייה "${seminary.name}" לא אושרה`,
        body: bodyText,
        seminaryId: seminary._id,
      });

      if (creator.email) {
        try {
          await sendSeminaryRejectedEmail({
            to: creator.email,
            userName: creatorName,
            seminaryName: seminary.name,
          });
        } catch (mailErr) {
          console.error("[rejectSeminary] mail failed:", mailErr?.message);
        }
      }
    }

    const updated = await Seminary.findById(seminary._id).populate(seminaryPopulates).lean();
    return res.status(200).send(updated);
  } catch (err) {
    console.error("[rejectSeminary]", err);
    return res.status(500).send({ message: "שגיאה בדחיית המדרשייה" });
  }
}

module.exports = {
  listPendingLecturers,
  approveLecturer,
  rejectLecturer,
  listPendingSeminaries,
  approveSeminary,
  rejectSeminary,
};
