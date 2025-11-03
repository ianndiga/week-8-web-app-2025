const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Appointment Identification
  appointmentId: {
    type: String,
    unique: true,
    default: () => 'APT' + Date.now().toString().slice(-6)
  },
  
  // Patient Information
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientId: {
    type: String,
    required: true
  },
  
  // Doctor Information
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  doctorId: {
    type: String,
    required: true
  },
  
  // Department Information
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  
  // Appointment Timing - CHOOSE ONE APPROACH:
  // APPROACH 1: Use separate date and time (Recommended)
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  
  // OR APPROACH 2: Use single datetime field
  // dateTime: {
  //   type: Date,
  //   required: true
  // },
  
  duration: {
    type: Number,
    default: 30, // minutes
    min: 15,
    max: 120
  },
  
  // Appointment Details
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'checkup', 'emergency', 'surgery', 'therapy'],
    default: 'consultation'
  },
  consultationType: {
    type: String,
    enum: ['in-person', 'online', 'phone'],
    default: 'in-person'
  },
  
  // Medical Information
  reason: {
    type: String,
    required: true,
    trim: true
  },
  symptoms: [String],
  diagnosis: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  
  // Prescription Information
  prescription: [{
    medicine: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String,
    prescribedDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Appointment Status
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  
  // Payment Information
  payment: {
    amount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'partially-paid'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'insurance', 'card', 'mobile', 'bank-transfer']
    },
    transactionId: String,
    paidAmount: {
      type: Number,
      default: 0
    },
    paymentDate: Date
  },
  
  // Follow-up Information
  followUpDate: Date,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpNotes: String,
  
  // Clinical Notes
  notes: String,
  doctorNotes: String,
  nurseNotes: String,
  
  // Vital Signs (to be filled during appointment)
  vitalSigns: {
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    bmi: Number
  },
  
  // Laboratory and Tests
  labTests: [{
    testName: String,
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabRequest'
    },
    status: {
      type: String,
      enum: ['ordered', 'in-progress', 'completed', 'cancelled'],
      default: 'ordered'
    },
    results: String,
    resultDate: Date
  }],
  
  // Referrals
  referrals: [{
    referredTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    reason: String,
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine'
    },
    notes: String
  }],
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    fileType: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  
  // Communication Log
  communicationLog: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'call', 'system', 'manual'],
      required: true
    },
    message: String,
    sentTo: String, // phone or email
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'communicationLog.sentByModel'
    },
    sentByModel: {
      type: String,
      enum: ['User', 'System']
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Cancellation Information
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'cancellation.cancelledByModel'
    },
    cancelledByModel: {
      type: String,
      enum: ['Patient', 'Doctor', 'Admin']
    },
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'not-eligible'],
      default: 'pending'
    }
  },
  
  // Reminder Settings
  reminders: {
    sms: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    daysBefore: {
      type: Number,
      default: 1
    },
    hoursBefore: {
      type: Number,
      default: 2
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true
});

// Virtual for full appointment info
appointmentSchema.virtual('fullInfo').get(function() {
  return {
    appointmentId: this.appointmentId,
    patient: this.patient,
    doctor: this.doctor,
    date: this.appointmentDate,
    time: this.appointmentTime,
    type: this.type,
    status: this.status,
    reason: this.reason
  };
});

// Virtual for appointment duration in hours
appointmentSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// Virtual for isUpcoming
appointmentSchema.virtual('isUpcoming').get(function() {
  const appointmentDateTime = new Date(this.appointmentDate);
  appointmentDateTime.setHours(
    parseInt(this.appointmentTime?.split(':')[0] || 0),
    parseInt(this.appointmentTime?.split(':')[1] || 0)
  );
  return appointmentDateTime > new Date() && 
         ['scheduled', 'confirmed', 'checked-in'].includes(this.status);
});

// Virtual for isPast
appointmentSchema.virtual('isPast').get(function() {
  const appointmentDateTime = new Date(this.appointmentDate);
  appointmentDateTime.setHours(
    parseInt(this.appointmentTime?.split(':')[0] || 0),
    parseInt(this.appointmentTime?.split(':')[1] || 0)
  );
  return appointmentDateTime <= new Date();
});

// Pre-save middleware to ensure data consistency
appointmentSchema.pre('save', function(next) {
  // Calculate BMI if weight and height are provided
  if (this.vitalSigns?.weight && this.vitalSigns?.height) {
    const heightInMeters = this.vitalSigns.height / 100;
    this.vitalSigns.bmi = this.vitalSigns.weight / (heightInMeters * heightInMeters);
  }
  
  next();
});

// Indexes for better performance
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ department: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ 'payment.status': 1 });
appointmentSchema.index({ followUpDate: 1 });

// Static method to find appointments by date range
appointmentSchema.statics.findByDateRange = function(startDate, endDate, status = null) {
  const filter = {
    appointmentDate: { $gte: startDate, $lte: endDate }
  };
  
  if (status) {
    filter.status = status;
  }
  
  return this.find(filter)
    .populate('patient', 'firstName lastName patientId phone email')
    .populate('doctor', 'name specialization profileImage')
    .sort({ appointmentDate: 1, appointmentTime: 1 });
};

// Static method to find conflicting appointments
appointmentSchema.statics.findConflicts = function(doctorId, date, time, duration = 30, excludeAppointmentId = null) {
  const appointmentDate = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  const startTime = hours * 60 + minutes;
  const endTime = startTime + duration;
  
  const filter = {
    doctorId,
    appointmentDate: appointmentDate,
    status: { $in: ['scheduled', 'confirmed', 'checked-in', 'in-progress'] }
  };
  
  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }
  
  return this.find(filter).then(appointments => {
    return appointments.filter(apt => {
      const aptTime = apt.appointmentTime;
      const [aptHours, aptMinutes] = aptTime.split(':').map(Number);
      const aptStartTime = aptHours * 60 + aptMinutes;
      const aptEndTime = aptStartTime + (apt.duration || 30);
      
      return (startTime < aptEndTime && endTime > aptStartTime);
    });
  });
};

// Method to add prescription
appointmentSchema.methods.addPrescription = function(prescriptionData) {
  this.prescription.push({
    ...prescriptionData,
    prescribedDate: new Date()
  });
  return this.save();
};

// Method to update payment
appointmentSchema.methods.updatePayment = function(amount, method, transactionId = null) {
  this.payment.amount = amount;
  this.payment.method = method;
  this.payment.transactionId = transactionId;
  this.payment.paymentDate = new Date();
  this.payment.status = 'paid';
  this.payment.paidAmount = amount;
  return this.save();
};

// Method to cancel appointment
appointmentSchema.methods.cancelAppointment = function(reason, cancelledBy, cancelledByModel) {
  this.status = 'cancelled';
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledByModel,
    cancelledAt: new Date()
  };
  return this.save();
};

// Method to add communication log
appointmentSchema.methods.addCommunication = function(type, message, sentTo, sentBy, sentByModel, status = 'sent') {
  this.communicationLog.push({
    type,
    message,
    sentTo,
    sentBy,
    sentByModel,
    status,
    timestamp: new Date()
  });
  return this.save();
};

// Ensure virtual fields are serialized
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);