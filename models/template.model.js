const mongoose = require("mongoose");
const TemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  askForPrice: { type: Boolean, required: true },
  desc: { type: String, required: true },
  poster: { type: String },
  body: {type: Object, required: true}
});
const TemplateModel = mongoose.model("template", TemplateSchema);
module.exports = TemplateModel;