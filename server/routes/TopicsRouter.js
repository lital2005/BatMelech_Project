const express = require('express');
const topicsController = require('../controllers/TopicsController');
const topicsRouter = express.Router();

topicsRouter.get('/', topicsController.getAllTopics);
topicsRouter.get('/:id', topicsController.getTopicById);
topicsRouter.post('/', topicsController.addNewTopic);
topicsRouter.delete('/:id', topicsController.deleteTopic);
topicsRouter.put('/:id', topicsController.updateTopic);

module.exports = topicsRouter;