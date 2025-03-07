const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    occupation: { type: String },
    company: { type: String },
    bio: { type: String },
    avatar: { type: String },
    role: { type: String, default: "user" },
    refreshToken: { type: String }
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;
