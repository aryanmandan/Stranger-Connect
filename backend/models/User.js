const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  profilePic: { type: String, default: '' },
  age: { type: Number, min: 13, max: 100 },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  preference: { type: [String], default: ['male', 'female', 'other'] },
  location: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);
