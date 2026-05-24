const express = require('express');
const seminaryController = require('../controllers/SeminaryController');

const seminaryRouter = express.Router();

seminaryRouter.get('/', seminaryController.getAllSeminaries);

seminaryRouter.get('/:id', seminaryController.getSeminaryById);

seminaryRouter.post('/', seminaryController.addNewSeminary);

seminaryRouter.delete('/:id', seminaryController.deleteSeminary);

seminaryRouter.put('/:id', seminaryController.updateSeminary);

module.exports = seminaryRouter;