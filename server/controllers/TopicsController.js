const Topics = require('../models/TopicsModel');

const getAllTopics = async (req, res) => {
    try {
        const data = await Topics.find();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const getTopicById = async (req, res) => {
    try {
        const data = await Topics.findById(req.params.id);
        if (!data) return res.status(404).send({ message: "Not found" });
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const addNewTopic = async (req, res) => {
    try {
        const payload = { ...req.body };

        if (payload.topicCode === undefined || payload.topicCode === null || payload.topicCode === "") {
            const last = await Topics.findOne({}, { topicCode: 1 }).sort({ topicCode: -1 }).lean();
            payload.topicCode = (last?.topicCode ?? 0) + 1;
        }

        const newItem = new Topics(payload);
        await newItem.save();
        res.status(200).send(newItem);
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

const deleteTopic = async (req, res) => {
    try {
        const deleted = await Topics.findByIdAndDelete(req.params.id);
        res.status(200).send(deleted);
    } catch (err) {
        res.status(500).send(err);
    }
};

const updateTopic = async (req, res) => {
    try {
        const updated = await Topics.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body } },
            { new: true }
        );
        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send(err);
    }
};

module.exports = {
    getAllTopics,
    getTopicById,
    addNewTopic,
    deleteTopic,
    updateTopic
};