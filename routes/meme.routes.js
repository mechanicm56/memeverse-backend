const express = require('express');
const router = express.Router();
const memeController = require('../controllers/meme.controller');
const { authenticateToken } = require('../middlewares/authware');
 
router.get('', memeController.getMemes);

router.get('/post/:memeId', memeController.getMeme);

router.get('/most-liked', memeController.getMostLikedMemes);

router.post('', authenticateToken, memeController.postMeme);
// Add a comment
router.post('/comment/:memeId', authenticateToken, memeController.addComment);

router.post('/like/:memeId', authenticateToken, memeController.likeDislike);

module.exports = router;