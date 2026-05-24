const express = require('express');
const qaController = require('../controllers/QuestionsAnswersController');

const qaRouter = express.Router();

qaRouter.get('/public/answered', qaController.getAnsweredForPublic);

qaRouter.get('/student/my-threads', qaController.getStudentThreads);
qaRouter.get('/inbox/unanswered', qaController.getInboxUnanswered);
qaRouter.get('/lecturer/student-chats', qaController.getLecturerStudentChats);
qaRouter.get('/lecturer/student/:studentId/messages', qaController.getLecturerStudentUnifiedMessages);

qaRouter.get('/thread/:threadId/messages', qaController.getThreadMessages);
qaRouter.post('/thread/:threadId/messages', qaController.postThreadMessage);
qaRouter.delete('/thread/:threadId/messages/:messageId', qaController.deleteThreadMessage);
qaRouter.post(
  '/thread/:threadId/messages/:messageId/publish-public',
  qaController.publishThreadMessagePublic
);
qaRouter.delete('/thread/:threadId/publish-public', qaController.deletePublishedPublic);

qaRouter.get('/', qaController.getAllQA);

qaRouter.get('/:id', qaController.getQAById);

qaRouter.post('/', qaController.addNewQA);

qaRouter.delete('/:id', qaController.deleteQA);

qaRouter.put('/:id', qaController.updateQA);

module.exports = qaRouter;