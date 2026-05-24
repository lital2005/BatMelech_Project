const Seminary = require('../models/SeminaryModel');

function getUserIdFromReq(req) {
    const raw = req.headers['x-user-id'];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

const populates = [
    { path: 'galleryImages', select: 'image description date createdAt' },
    {
        path: 'materials',
        select: 'content attachments attachmentMeta topicCode rabbiUserCode date createdAt',
        populate: [
            { path: 'topicCode', select: 'topicName' },
            { path: 'rabbiUserCode', select: 'firstName lastName status' },
        ],
    },
];

const getAllSeminaries = async (req, res) => {
    try {
        const data = await Seminary.find().populate(populates);
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const getSeminaryById = async (req, res) => {
    try {
        const data = await Seminary.findById(req.params.id).populate(populates);
        if (!data) return res.status(404).send({ message: "Not found" });
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const addNewSeminary = async (req, res) => {
    try {
        const payload = { ...req.body };

        // seminaryCode generation: if not provided, auto-increment based on existing max.
        if (payload.seminaryCode === undefined || payload.seminaryCode === null || payload.seminaryCode === "") {
            const last = await Seminary.findOne({}, { seminaryCode: 1 }).sort({ seminaryCode: -1 }).lean();
            payload.seminaryCode = (last?.seminaryCode ?? 0) + 1;
        }

        const userId = getUserIdFromReq(req);
        if (userId) {
            payload.createdBy = userId;
            payload.approvalStatus = "pending";
            payload.status = "inactive";
        }

        const newItem = new Seminary(payload);
        await newItem.save();
        res.status(200).send(newItem);
    } catch (err) {
        // Duplicate key (e.g., seminaryCode)
        if (err?.code === 11000) {
            return res.status(409).send({ message: "Duplicate value", key: err?.keyPattern });
        }
        if (err?.name === 'ValidationError') {
            return res.status(400).send({ message: "Validation failed", errors: err?.errors });
        }
        res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteSeminary = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const seminary = await Seminary.findById(req.params.id);
        if (!seminary) return res.status(404).send({ message: "Not found" });

        if (userId && seminary.createdBy && String(seminary.createdBy) !== String(userId)) {
            return res.status(403).send({ message: "Forbidden" });
        }

        const deleted = await Seminary.findByIdAndDelete(req.params.id);
        return res.status(200).send(deleted);
    } catch (err) {
        res.status(500).send(err);
    }
};

const updateSeminary = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const seminary = await Seminary.findById(req.params.id);
        if (!seminary) return res.status(404).send({ message: "Not found" });

        if (userId && seminary.createdBy && String(seminary.createdBy) !== String(userId)) {
            return res.status(403).send({ message: "Forbidden" });
        }

        const patch = { ...req.body };
        delete patch.approvalStatus;
        delete patch.createdBy;
        delete patch.seminaryCode;

        const approval = String(seminary.approvalStatus ?? "approved").toLowerCase();
        if (approval !== "approved") {
            delete patch.status;
        } else if (patch.status && !["active", "inactive"].includes(String(patch.status))) {
            delete patch.status;
        }

        const updated = await Seminary.findByIdAndUpdate(
            req.params.id,
            { $set: patch },
            { new: true, runValidators: true }
        );
        return res.status(200).send(updated);
    } catch (err) {
        if (err?.name === 'ValidationError') {
            return res.status(400).send({ message: "Validation failed", errors: err?.errors });
        }
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
    getAllSeminaries,
    getSeminaryById,
    addNewSeminary,
    deleteSeminary,
    updateSeminary
};