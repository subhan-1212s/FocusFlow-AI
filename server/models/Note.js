const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  url: { type: String, required: true },
  domain: { type: String, required: true },
  title: { type: String, default: '' },
  content: { type: String, required: true },
  tags: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
