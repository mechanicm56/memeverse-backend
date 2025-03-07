const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  memeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meme', required: true },
  user: { type: String, required: true },  // You can replace this with a user ID or an actual user object
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
