// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  idNumber: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  role: {
    type: String,
    enum: ['doctor', 'nurse', 'hr_staff', 'ict_staff', 'admin_staff', 'support_staff'],
    required: true
  },
  specialization: {
    type: String,
    required: function() { return this.role === 'doctor'; }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  loginCredentials: {
    username: String,
    password: String,
    temporaryPassword: {
      type: Boolean,
      default: true
    },
    lastPasswordChange: Date
  },
  employmentDetails: {
    hireDate: Date,
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'temporary']
    },
    salary: Number,
    position: String
  },
  assignedDepartments: [{
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    assignedDate: Date,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  }],
  schedule: {
    workingDays: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String,
      breaks: [{
        startTime: String,
        endTime: String,
        duration: Number
      }]
    }],
    unavailableSlots: [{
      date: Date,
      startTime: String,
      endTime: String,
      reason: String
    }]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Employee', employeeSchema);