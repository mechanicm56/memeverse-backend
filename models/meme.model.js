const mongoose = require("mongoose");
const MemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  box_count: { type: Number },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
},
{
    timestamps: true
});
const Meme = mongoose.model("meme", MemeSchema);
module.exports = Meme;