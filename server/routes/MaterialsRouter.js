const express = require('express');
const materialsController = require('../controllers/MaterialsController');
const { upload } = require('../middleware/upload');

const materialsRouter = express.Router();

materialsRouter.get('/', materialsController.getAllMaterials);

materialsRouter.post(
  '/seminary/:seminaryId/upload',
  upload.array('files', 12),
  materialsController.uploadMaterialForSeminary
);

materialsRouter.get('/:id', materialsController.getMaterialById);

materialsRouter.post('/', materialsController.addNewMaterial);

materialsRouter.delete('/:id', materialsController.deleteMaterial);

materialsRouter.put('/:id', materialsController.updateMaterial);

module.exports = materialsRouter;
