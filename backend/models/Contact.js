// backend/models/Contact.js
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  operatingHours: {
    type: String,
    required: true
  },
  emergencyPhone: {
    type: String,
    required: true
  },
  whatsapp: String,
  facebook: String,
  twitter: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Contact', contactSchema);

// backend/models/ContactSubmission.js
const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: String,
  subject: {
    type: String,
    required: true
  },
  department: String,
  message: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: 'website'
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new'
  },
  ipAddress: String
}, {
  timestamps: true
});

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);