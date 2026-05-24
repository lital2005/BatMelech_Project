const Comments = require('../models/CommentsModel');

function normalizeRating(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 5) return null;
    return n;
}

function getUserIdFromReq(req) {
    const raw = req.headers['x-user-id'];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

async function getNextCommentCode() {
    const last = await Comments.findOne({}, { code: 1 }).sort({ code: -1 }).lean();
    return (last?.code ?? 0) + 1;
}

const getAllComments = async (req, res) => {
    try {
        const data = await Comments.find()
            .populate("userCode")
            .populate("seminaryCode")
            .sort({ createdAt: -1 });
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

/** תגובות למדרשייה ספציפית — לשימוש באתר */
const getCommentsBySeminary = async (req, res) => {
    try {
        const { seminaryId } = req.params;
        const data = await Comments.find({ seminaryCode: seminaryId })
            .populate("userCode", "firstName lastName email status")
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const getCommentById = async (req, res) => {
    try {
        const data = await Comments.findById(req.params.id)
            .populate("userCode")
            .populate("seminaryCode");

        if (!data) return res.status(404).send({ message: "Not found" });

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const addNewComment = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const payload = { ...req.body };

        if (payload.code === undefined || payload.code === null || payload.code === "") {
            payload.code = await getNextCommentCode();
        }

        if (userId && (!payload.userCode || payload.userCode === "")) {
            payload.userCode = userId;
        }

        const rating = normalizeRating(payload.rating);
        if (rating === null) {
            return res.status(400).send({ message: "חובה לבחור דירוג בין 1 ל־5 כוכבים" });
        }
        payload.rating = rating;

        const newItem = new Comments(payload);
        await newItem.save();

        const populated = await Comments.findById(newItem._id)
            .populate("userCode", "firstName lastName email status")
            .populate("seminaryCode");

        res.status(200).send(populated);
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(409).send({ message: "Duplicate value", key: err?.keyPattern });
        }
        if (err?.name === 'ValidationError') {
            return res.status(400).send({ message: "Validation failed", errors: err?.errors });
        }
        res.status(500).send(err);
    }
};

const deleteComment = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const comment = await Comments.findById(req.params.id).populate("userCode");
        if (!comment) return res.status(404).send({ message: "Not found" });

        if (userId && String(comment.userCode?._id ?? comment.userCode) !== String(userId)) {
            return res.status(403).send({ message: "Forbidden" });
        }

        const deleted = await Comments.findByIdAndDelete(req.params.id);
        res.status(200).send(deleted);
    } catch (err) {
        res.status(500).send(err);
    }
};

const updateComment = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const comment = await Comments.findById(req.params.id);
        if (!comment) return res.status(404).send({ message: "Not found" });

        if (userId && String(comment.userCode) !== String(userId)) {
            return res.status(403).send({ message: "Forbidden" });
        }

        const patch = { ...req.body };
        if (Object.prototype.hasOwnProperty.call(patch, 'rating')) {
            const rating = normalizeRating(patch.rating);
            if (rating === null) {
                return res.status(400).send({ message: "דירוג חייב להיות מספר שלם בין 1 ל־5" });
            }
            patch.rating = rating;
        }

        const updated = await Comments.findByIdAndUpdate(
            req.params.id,
            { $set: patch },
            { new: true, runValidators: true }
        )
            .populate("userCode", "firstName lastName email status")
            .populate("seminaryCode");

        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send(err);
    }
};

module.exports = {
    getAllComments,
    getCommentsBySeminary,
    getCommentById,
    addNewComment,
    deleteComment,
    updateComment
};
