const mongoose = require('mongoose');

const labRequestSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    ref: 'Patient'
  },
  testType: {
    type: String,
    required: true
  },
  reason: String,
  urgency: {
    type: String,
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine'
  },
  status: {
    type: String,
    enum: ['requested', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  results: String
}, {
  timestamps: true
});

module.exports = mongoose.model('LabRequest', labRequestSchema);