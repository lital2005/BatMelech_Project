const express = require("express");
const enrollmentController = require("../controllers/EnrollmentController");

const enrollmentRouter = express.Router();

enrollmentRouter.post("/request", enrollmentController.requestJoin);
enrollmentRouter.get("/my", enrollmentController.myRequests);
enrollmentRouter.get("/lecturer", enrollmentController.listForLecturer);
enrollmentRouter.post("/:id/initial-approval", enrollmentController.sendInitialApproval);

module.exports = enrollmentRouter;
