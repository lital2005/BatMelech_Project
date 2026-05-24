const express = require('express');
const commentsController = require('../controllers/CommentsController');

const commentsRouter = express.Router();

commentsRouter.get('/', commentsController.getAllComments);

commentsRouter.get('/seminary/:seminaryId', commentsController.getCommentsBySeminary);

commentsRouter.get('/:id', commentsController.getCommentById);

commentsRouter.post('/', commentsController.addNewComment);

commentsRouter.delete('/:id', commentsController.deleteComment);

commentsRouter.put('/:id', commentsController.updateComment);

module.exports = commentsRouter;
