const mongoose = require('mongoose');

const likeDislikeSchema = new mongoose.Schema({
  memeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meme', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // You can replace this with an actual user ID
  type: { type: String, enum: ['like', 'dislike'], required: true },
  createdAt: { type: Date, default: Date.now }
});

const LikeDislike = mongoose.model('LikeDislike', likeDislikeSchema);

module.exports = LikeDislike;
