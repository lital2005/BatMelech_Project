const Materials = require('../models/MaterialsModel');
const Seminary = require('../models/SeminaryModel');

function getUserIdFromReq(req) {
    const raw = req.headers['x-user-id'];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

async function getNextMaterialCode() {
    const last = await Materials.findOne({}, { code: 1 }).sort({ code: -1 }).lean();
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

const getAllMaterials = async (req, res) => {
    try {
        const data = await Materials.find()
            .populate("rabbiUserCode")
            .populate("topicCode");

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const getMaterialById = async (req, res) => {
    try {
        const data = await Materials.findById(req.params.id)
            .populate("rabbiUserCode")
            .populate("topicCode");

        if (!data)
            return res.status(404).send({ message: "Material not found" });

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const addNewMaterial = async (req, res) => {
    try {
        const payload = { ...req.body };

        if (payload.code === undefined || payload.code === null || payload.code === "") {
            payload.code = await getNextMaterialCode();
        }

        const newItem = new Materials(payload);
        await newItem.save();

        const populatedMaterial = await Materials.findById(newItem._id)
            .populate("rabbiUserCode")
            .populate("topicCode");

        res.status(200).send(populatedMaterial);
    } catch (err) {
        res.status(500).send(err);
    }
};

/** multipart: fields content + topicCode + optional files[] */
const uploadMaterialForSeminary = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const seminaryId = req.params.seminaryId;

        const gate = await assertCanManageSeminary(seminaryId, userId);
        if (!gate.ok) return res.status(gate.status).send({ message: gate.message });

        const content = req.body?.content;
        const topicCode = req.body?.topicCode;
        if (!content || !topicCode) {
            return res.status(400).send({ message: "content and topicCode are required" });
        }

        const files = req.files ?? [];
        const urls = files.map((f) => `/uploads/${f.filename}`);
        const meta = files.map((f) => ({
            url: `/uploads/${f.filename}`,
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
        }));

        const doc = await Materials.create({
            code: await getNextMaterialCode(),
            rabbiUserCode: userId,
            topicCode,
            content,
            attachments: urls,
            attachmentMeta: meta,
        });

        await Seminary.findByIdAndUpdate(seminaryId, {
            $addToSet: { materials: doc._id },
        });

        const populatedMaterial = await Materials.findById(doc._id)
            .populate("rabbiUserCode")
            .populate("topicCode");

        return res.status(200).send(populatedMaterial);
    } catch (err) {
        console.log("❌ uploadMaterialForSeminary failed", err);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

const deleteMaterial = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const mat = await Materials.findById(req.params.id);
        if (!mat) return res.status(404).send({ message: "Material not found" });

        const sem = await Seminary.findOne({ materials: mat._id });
        if (!sem) {
            const deleted = await Materials.findByIdAndDelete(req.params.id);
            return res.status(200).send({ message: "Material deleted", deleted });
        }

        const gate = await assertCanManageSeminary(sem._id, userId);
        if (!gate.ok) return res.status(gate.status).send({ message: gate.message });

        await Seminary.findByIdAndUpdate(sem._id, { $pull: { materials: mat._id } });

        const deleted = await Materials.findByIdAndDelete(req.params.id)
            .populate("rabbiUserCode")
            .populate("topicCode");

        res.status(200).send({ message: "Material deleted", deleted });
    } catch (err) {
        res.status(500).send(err);
    }
};

const updateMaterial = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const mat = await Materials.findById(req.params.id);
        if (!mat) return res.status(404).send({ message: "Material not found" });

        const sem = await Seminary.findOne({ materials: mat._id });
        if (sem) {
            const gate = await assertCanManageSeminary(sem._id, userId);
            if (!gate.ok) return res.status(gate.status).send({ message: gate.message });
        }

        const updated = await Materials.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body } },
            { new: true, runValidators: true }
        )
            .populate("rabbiUserCode")
            .populate("topicCode");

        res.status(200).send({ message: "Material updated", updated });
    } catch (err) {
        res.status(500).send(err);
    }
};

module.exports = {
    getAllMaterials,
    getMaterialById,
    addNewMaterial,
    uploadMaterialForSeminary,
    deleteMaterial,
    updateMaterial
};
