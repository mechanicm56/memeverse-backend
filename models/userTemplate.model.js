const mongoose = require("mongoose");
const UserTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: String, required: true },
  askForPrice: { type: Boolean, required: true },
  desc: { type: String, required: true },
  poster: { type: String },
  templateId: {type: String, required: true},
  userId: {type: String, required: true},
});
const UserTemplateModel = mongoose.model("template", UserTemplateSchema);
module.exports = UserTemplateModel;