const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    ref: 'Patient'
  },
  medication: {
    type: String,
    required: true
  },
  dosage: String,
  frequency: String,
  reason: String,
  prescribedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'requested', 'refill-requested'],
    default: 'active'
  },
  refillsRequested: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prescription', prescriptionSchema);