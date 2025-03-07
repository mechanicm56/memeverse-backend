const express = require('express');
const router = express.Router();
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const templateRoute = require('./template.route');
const memeRoutes = require('./meme.routes');

router.use('/auth', authRoute);
router.use('/user', userRoute);
router.use('/template', templateRoute);
router.use('/meme', memeRoutes);

module.exports = router;