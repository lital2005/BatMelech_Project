const express = require("express");
const managerController = require("../controllers/ManagerController");
const { requireManager } = require("../middleware/auth");

const managerRouter = express.Router();

managerRouter.use(requireManager);

managerRouter.get("/lecturers/pending", managerController.listPendingLecturers);
managerRouter.post("/lecturers/:id/approve", managerController.approveLecturer);
managerRouter.post("/lecturers/:id/reject", managerController.rejectLecturer);

managerRouter.get("/seminaries/pending", managerController.listPendingSeminaries);
managerRouter.post("/seminaries/:id/approve", managerController.approveSeminary);
managerRouter.post("/seminaries/:id/reject", managerController.rejectSeminary);

module.exports = managerRouter;
