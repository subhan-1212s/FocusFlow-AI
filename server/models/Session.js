const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  tabs: [{
    title: { type: String, required: true },
    url: { type: String, required: true }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
