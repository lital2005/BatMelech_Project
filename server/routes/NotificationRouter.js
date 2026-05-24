const express = require("express");
const notificationController = require("../controllers/NotificationController");

const notificationRouter = express.Router();

notificationRouter.get("/", notificationController.listMine);
notificationRouter.get("/unread-count", notificationController.unreadCount);
notificationRouter.post("/read-all", notificationController.markAllRead);
notificationRouter.post("/:id/read", notificationController.markRead);

module.exports = notificationRouter;
