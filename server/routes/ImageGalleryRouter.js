const express = require('express');
const galleryController = require('../controllers/ImageGalleryController');
const { upload } = require('../middleware/upload');

const galleryRouter = express.Router();

galleryRouter.get('/', galleryController.getAllImages);

galleryRouter.post(
  '/seminary/:seminaryId/upload',
  upload.single('file'),
  galleryController.uploadImageForSeminary
);

galleryRouter.get('/:id', galleryController.getImageById);

galleryRouter.post('/', galleryController.addNewImage);

galleryRouter.delete('/:id', galleryController.deleteImage);

galleryRouter.put('/:id', galleryController.updateImage);

module.exports = galleryRouter;
