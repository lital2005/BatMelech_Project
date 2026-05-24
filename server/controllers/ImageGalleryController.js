const ImageGallery = require('../models/ImageGalleryModel');
const Seminary = require('../models/SeminaryModel');

function getUserIdFromReq(req) {
    const raw = req.headers['x-user-id'];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

async function getNextImageCode() {
    const last = await ImageGallery.findOne({}, { code: 1 }).sort({ code: -1 }).lean();
    return (last?.code ?? 0) + 1;
}

async function assertCanManageSeminary(seminaryId, userId) {
    if (!userId) return { ok: false, status: 401, message: "Unauthorized" };
    const sem = await Seminary.findById(seminaryId);
    if (!sem) return { ok: false, status: 404, message: "Seminary not found" };
    if (sem.createdBy && String(sem.createdBy) !== String(userId)) {
        return { ok: false, status: 403, message: "Forbidden" };
    }
    return { ok: true, seminary: sem };
}

const getAllImages = async (req, res) => {
    try {
        const data = await ImageGallery.find()
            .populate("seminaryCode");
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const getImageById = async (req, res) => {
    try {
        const data = await ImageGallery.findById(req.params.id)
            .populate("seminaryCode");

        if (!data) return res.status(404).send({ message: "Not found" });

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const addNewImage = async (req, res) => {
    try {
        const payload = { ...req.body };

        if (payload.code === undefined || payload.code === null || payload.code === "") {
            payload.code = await getNextImageCode();
        }

        const newItem = new ImageGallery(payload);
        await newItem.save();
        res.status(200).send(newItem);
    } catch (err) {
        res.status(500).send(err);
    }
};

/** multipart upload + link to Seminary.galleryImages */
const uploadImageForSeminary = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const seminaryId = req.params.seminaryId;

        const gate = await assertCanManageSeminary(seminaryId, userId);
        if (!gate.ok) return res.status(gate.status).send({ message: gate.message });

        const file = req.file;
        if (!file) return res.status(400).send({ message: "File is required" });

        const imageUrl = `/uploads/${file.filename}`;
        const description = req.body?.description ?? "";

        const doc = await ImageGallery.create({
            code: await getNextImageCode(),
            rabbiUserCode: userId,
            seminaryCode: seminaryId,
            image: imageUrl,
            description,
        });

        await Seminary.findByIdAndUpdate(seminaryId, {
            $addToSet: { galleryImages: doc._id },
        });

        const populated = await ImageGallery.findById(doc._id).populate("seminaryCode");
        return res.status(200).send(populated);
    } catch (err) {
        console.log("❌ uploadImageForSeminary failed", err);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteImage = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const img = await ImageGallery.findById(req.params.id);
        if (!img) return res.status(404).send({ message: "Not found" });

        const gate = await assertCanManageSeminary(img.seminaryCode, userId);
        if (!gate.ok) return res.status(gate.status).send({ message: gate.message });

        await Seminary.findByIdAndUpdate(img.seminaryCode, {
            $pull: { galleryImages: img._id },
        });

        const deleted = await ImageGallery.findByIdAndDelete(req.params.id);
        res.status(200).send(deleted);
    } catch (err) {
        res.status(500).send(err);
    }
};

const updateImage = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const img = await ImageGallery.findById(req.params.id);
        if (!img) return res.status(404).send({ message: "Not found" });

        const gate = await assertCanManageSeminary(img.seminaryCode, userId);
        if (!gate.ok) return res.status(gate.status).send({ message: gate.message });

        const updated = await ImageGallery.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body } },
            { new: true, runValidators: true }
        );
        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send(err);
    }
};

module.exports = {
    getAllImages,
    getImageById,
    addNewImage,
    uploadImageForSeminary,
    deleteImage,
    updateImage
};
