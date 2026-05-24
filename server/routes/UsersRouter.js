const express = require('express');
const userController = require('../controllers/UsersController');
const { uploadProfile } = require('../middleware/uploadProfile');

const userRouter = express.Router();

userRouter.get('/', userController.getAllUsers);

userRouter.post('/login', userController.loginUser);

userRouter.post('/forgot-password', userController.forgotPassword);

userRouter.post('/reset-password', userController.resetPassword);

userRouter.get('/public/lecturers', userController.getPublicLecturers);

userRouter.post(
    '/:id/profile-image',
    uploadProfile.single('avatar'),
    userController.uploadProfileImage
);

userRouter.get('/:id', userController.getUserById);

userRouter.post('/', userController.addNewUser);

userRouter.delete('/:id', userController.deleteUser);

userRouter.put('/:id', userController.updateUser);

module.exports = userRouter;