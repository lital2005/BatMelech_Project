const Notification = require("../models/NotificationModel");
const { getUserIdFromReq, loadUserByHeader } = require("../middleware/auth");

async function listMine(req, res) {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).send({ message: "נדרשת התחברות" });
    }

    const rows = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).send(rows);
  } catch (err) {
    console.error("[listMine notifications]", err);
    return res.status(500).send({ message: "שגיאה בטעינת הודעות" });
  }
}

async function unreadCount(req, res) {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).send({ message: "נדרשת התחברות" });
    }

    const count = await Notification.countDocuments({
      recipientId: userId,
      readAt: null,
    });

    return res.status(200).send({ count });
  } catch (err) {
    console.error("[unreadCount]", err);
    return res.status(500).send({ message: "שגיאה" });
  }
}

async function markRead(req, res) {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).send({ message: "נדרשת התחברות" });
    }

    const row = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: userId },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();

    if (!row) {
      return res.status(404).send({ message: "הודעה לא נמצאה" });
    }

    return res.status(200).send(row);
  } catch (err) {
    console.error("[markRead]", err);
    return res.status(500).send({ message: "שגיאה" });
  }
}

async function markAllRead(req, res) {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).send({ message: "נדרשת התחברות" });
    }

    await Notification.updateMany(
      { recipientId: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return res.status(200).send({ ok: true });
  } catch (err) {
    console.error("[markAllRead]", err);
    return res.status(500).send({ message: "שגיאה" });
  }
}

module.exports = {
  listMine,
  unreadCount,
  markRead,
  markAllRead,
};
