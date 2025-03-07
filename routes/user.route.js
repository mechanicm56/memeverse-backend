const express = require('express');
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const UserModel = require('../models/user.model');
const cloudinary = require('../utils/cloudinary');
const userController = require('../controllers/user.controller');

// middleware 
const { authenticateToken } = require('../middlewares/authware');
const { getDataUri } = require('../utils/dataURI');

// get single account data 
router.get('/get-account-data', authenticateToken, async (req, res) => {
    const { email } = req.query;
    if (email) {
        try {
            const user = await UserModel.findOne({ email: email }).select('name email bio avatar');
            res.status(200).json({ user: user });
        } catch (error) {
            res.status(400).json("user not found")
            console.log(error)
        }
    } else {
        res.status(403).json("Unauthorized request for getting user!");
    }
})

// update account data 
router.patch('/update-account/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, occupation, company, bio } = req.body;
    // console.log(req.file);
    // let profile = (req.file) ? req.file.filename : null;
    const data = { name, email, occupation, company, bio };
    if (req.body.avatar) {
        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(req.body.avatar, {
            resource_type: 'auto',  // Automatically detect file type
        });

        data.avatar = result.secure_url;
    }
    try {
        await UserModel.findByIdAndUpdate(id, data);
        res.status(200).json({
            message: "Profile Updated!"
        });
    } catch (err) {
        console.log(err);
        res.send({ status: 'error', message: 'Dublicate email' })
    }
})

// uploading header video 
router.patch('/upload-video/:id', async (req, res) => {
    const { id } = req.params;
    const file = req.file;
    try {
        if (!file) {
            throw new Error('No file uploaded');
        }
        const fileUri = getDataUri(file);
        const videoResult = await cloudinary.uploader.upload(fileUri.content, {
            folder: 'store_headers'
        });

        await UserModel.findByIdAndUpdate(id, {
            store_header: {
                public_id: videoResult.public_id,
                url: videoResult.secure_url
            }
        });

        res.status(200).json("Video uploaded successfully!");
    } catch (error) {
        console.error(error);
        res.status(500).json("Error uploading video: " + error.message);
    }
});

router.get('/liked_memes', userController.getLikedMemes);

router.get('/memes', userController.getUserMemes);

router.get('/ratings', userController.getUsersRatings);

module.exports = router;
