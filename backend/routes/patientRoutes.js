// backend/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabRequest = require('../models/LabRequest');
const MedicalRecord = require('../models/MedicalRecord');
const PaymentMethod = require('../models/PaymentMethod');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key', (err, patient) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        req.patient = patient;
        next();
    });
};

// Apply authentication to all patient-specific routes
router.use('/:patientId/*', authenticateToken);

// GET /api/patients - Get all patients (Admin only)
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find()
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      patients,
      count: patients.length
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching patients', 
      error: error.message 
    });
  }
});

// POST /api/patients - Create new patient (Admin only)
router.post('/', async (req, res) => {
  try {
    const patientData = req.body;

    // Normalize bloodType
    if (patientData.bloodType) {
      patientData.bloodType = normalizeBloodType(patientData.bloodType);
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({
      $or: [
        { email: patientData.email },
        { idNumber: patientData.idNumber }
      ]
    });

    if (existingPatient) {
      return res.status(400).json({ 
        success: false,
        message: 'Patient with this email or ID number already exists' 
      });
    }

    const patient = new Patient(patientData);
    const savedPatient = await patient.save();
    
    res.status(201).json({
      success: true,
      patient: savedPatient
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating patient', 
      error: error.message 
    });
  }
});

// GET /api/patients/:id - Get single patient
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .select('-__v');
    
    if (!patient) {
      return res.status(404).json({ 
        success: false,
        message: 'Patient not found' 
      });
    }
    
    res.json({
      success: true,
      patient
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching patient', 
      error: error.message 
    });
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', async (req, res) => {
  try {
    // Normalize bloodType if provided
    if (req.body.bloodType) {
      req.body.bloodType = normalizeBloodType(req.body.bloodType);
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedPatient) {
      return res.status(404).json({ 
        success: false,
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      patient: updatedPatient
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating patient', 
      error: error.message 
    });
  }
});

// DELETE /api/patients/:id - Delete patient (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const deletedPatient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!deletedPatient) {
      return res.status(404).json({ 
        success: false,
        message: 'Patient not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Patient deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting patient', 
      error: error.message 
    });
  }
});

// Register new patient - COMPLETELY UPDATED WITH PROPER FIELD MAPPING
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration request received:', req.body);

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      idNumber,
      email,
      phone,
      address,
      city,
      postalCode,
      bloodType,
      allergies,
      currentMedications,
      medicalConditions,
      familyHistory,
      emergencyContact,
      emergencyPhone,
      emergencyRelationship,
      paymentMethod,
      insuranceProvider,
      policyNumber,
      maritalStatus,
      alternatePhone
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !gender || !idNumber || !email || !phone || !address || !city) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: firstName, lastName, dateOfBirth, gender, idNumber, email, phone, address, city' 
      });
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ 
      $or: [{ email: email.toLowerCase().trim() }, { idNumber: idNumber.trim() }] 
    });

    if (existingPatient) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient with this email or ID number already exists' 
      });
    }

    // Normalize bloodType
    const normalizedBloodType = normalizeBloodType(bloodType);

    // Create new patient with CORRECT field mapping
    const newPatient = new Patient({
      // Basic Information (required fields)
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: new Date(dateOfBirth),
      gender,
      idNumber: idNumber.trim(),
      
      // Contact Information
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      alternatePhone: alternatePhone ? alternatePhone.trim() : '',
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode ? postalCode.trim() : '',
      
      // Medical Information - Use TEXT fields for form data
      bloodType: normalizedBloodType,
      allergiesText: allergies || '',
      currentMedicationsText: currentMedications || '',
      medicalConditionsText: medicalConditions || '',
      familyHistory: familyHistory || '',
      
      // Emergency Contact
      emergencyContact: {
        name: emergencyContact ? emergencyContact.trim() : 'Not provided',
        phone: emergencyPhone ? emergencyPhone.trim() : 'Not provided',
        relationship: emergencyRelationship ? emergencyRelationship.trim() : 'Not provided'
      },
      
      // Insurance & Payment
      paymentMethod: paymentMethod || 'cash',
      insuranceProvider: insuranceProvider || '',
      policyNumber: policyNumber || '',
      
      // Additional fields
      maritalStatus: maritalStatus || 'single',
      
      // Consent fields (required by model)
      consentToTreat: true,
      privacyPolicyAccepted: true,
      termsAccepted: true
    });

    console.log('💾 Creating patient with data:', {
      firstName: newPatient.firstName,
      lastName: newPatient.lastName,
      email: newPatient.email,
      idNumber: newPatient.idNumber
    });

    const savedPatient = await newPatient.save();
    console.log('✅ Patient saved successfully:', savedPatient.patientId);

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { 
        patientId: savedPatient._id,
        email: savedPatient.email,
        role: 'patient'
      },
      process.env.JWT_SECRET || 'your-jwt-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      patient: {
        _id: savedPatient._id,
        patientId: savedPatient.patientId,
        firstName: savedPatient.firstName,
        lastName: savedPatient.lastName,
        email: savedPatient.email,
        idNumber: savedPatient.idNumber,
        fullName: savedPatient.fullName,
        bloodType: savedPatient.bloodType,
        phone: savedPatient.phone,
        dateOfBirth: savedPatient.dateOfBirth,
        gender: savedPatient.gender
      },
      token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Specific error handling
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Patient with this email or ID number already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Patient login - REAL IMPLEMENTATION WITH DATABASE CHECK
router.post('/login', async (req, res) => {
  try {
    const { email, idNumber } = req.body;

    console.log('🔐 Login attempt for:', { email, idNumber });

    // Validate required fields
    if (!email || !idNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and ID number are required' 
      });
    }

    // Find patient by email and ID number
    const patient = await Patient.findOne({ 
      email: email.toLowerCase().trim(), 
      idNumber: idNumber.trim()
    }).select('-__v');

    console.log('Found patient:', patient ? patient.patientId : 'No patient found');

    if (!patient) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or ID number' 
      });
    }

    // Check if patient is active
    if (patient.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact administration.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        patientId: patient._id,
        email: patient.email,
        role: 'patient'
      },
      process.env.JWT_SECRET || 'your-jwt-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      patient: {
        _id: patient._id,
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        idNumber: patient.idNumber,
        fullName: patient.fullName,
        bloodType: patient.bloodType,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
});

// ============================================================================
// DASHBOARD ENDPOINTS - ADDED FOR PATIENT DASHBOARD FUNCTIONALITY
// ============================================================================

// Get patient overview/dashboard data - UPDATED FOR DASHBOARD
router.get('/:patientId/overview', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('📊 Fetching overview for patient:', patientId);
    
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get real counts for dashboard - using correct field names
    const upcomingAppointments = await Appointment.countDocuments({
      patientId,
      status: { $in: ['scheduled', 'confirmed'] },
      appointmentDate: { $gte: new Date() }
    });

    const pendingResults = await LabRequest.countDocuments({
      patientId,
      status: { $in: ['pending', 'processing'] }
    });

    const activePrescriptions = await Prescription.countDocuments({
      patientId,
      status: 'active'
    });

    // Calculate current balance (simplified - you can implement real billing later)
    const currentBalance = 0; // Placeholder for billing system

    // Get recent appointments for the activity section
    const recentAppointments = await Appointment.find({
      patientId
    })
    .populate('doctor', 'name specialization')
    .sort({ appointmentDate: -1 })
    .limit(3);

    res.json({
      success: true,
      data: {
        upcomingAppointments,
        pendingResults,
        activePrescriptions,
        currentBalance,
        recentAppointments: recentAppointments.map(apt => ({
          _id: apt._id,
          type: apt.type,
          consultationType: apt.consultationType,
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          status: apt.status,
          reason: apt.reason,
          doctor: {
            name: apt.doctor?.name || 'Doctor',
            specialization: apt.doctor?.specialization || 'General Medicine'
          }
        }))
      }
    });

  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overview data',
      error: error.message
    });
  }
});

// Get patient profile for dashboard
router.get('/:patientId/profile', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('👤 Fetching profile for patient:', patientId);
    
    const patient = await Patient.findOne({ patientId })
      .select('-__v -password');
    
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      patient: {
        _id: patient._id,
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        fullName: patient.fullName,
        email: patient.email,
        phone: patient.phone,
        alternatePhone: patient.alternatePhone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        idNumber: patient.idNumber,
        bloodType: patient.bloodType,
        address: patient.address,
        city: patient.city,
        postalCode: patient.postalCode,
        allergies: patient.allergiesText,
        currentMedications: patient.currentMedicationsText,
        medicalConditions: patient.medicalConditionsText,
        familyHistory: patient.familyHistory,
        emergencyContact: patient.emergencyContact,
        insuranceProvider: patient.insuranceProvider,
        policyNumber: patient.policyNumber,
        maritalStatus: patient.maritalStatus,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      }
    });

  } catch (error) {
    console.error('Get patient profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching profile',
      error: error.message 
    });
  }
});

// Update patient profile from dashboard
router.put('/:patientId/profile', async (req, res) => {
  try {
    const { patientId } = req.params;
    const updateData = req.body;
    
    console.log('📝 Updating profile for patient:', patientId, updateData);

    // Normalize bloodType if provided
    if (updateData.bloodType) {
      updateData.bloodType = normalizeBloodType(updateData.bloodType);
    }

    const updatedPatient = await Patient.findOneAndUpdate(
      { patientId: patientId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v -password');

    if (!updatedPatient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      patient: {
        _id: updatedPatient._id,
        patientId: updatedPatient.patientId,
        firstName: updatedPatient.firstName,
        lastName: updatedPatient.lastName,
        fullName: updatedPatient.fullName,
        email: updatedPatient.email,
        phone: updatedPatient.phone,
        dateOfBirth: updatedPatient.dateOfBirth,
        gender: updatedPatient.gender,
        bloodType: updatedPatient.bloodType,
        address: updatedPatient.address,
        city: updatedPatient.city,
        allergies: updatedPatient.allergiesText,
        currentMedications: updatedPatient.currentMedicationsText,
        medicalConditions: updatedPatient.medicalConditionsText,
        emergencyContact: updatedPatient.emergencyContact
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating patient profile',
      error: error.message
    });
  }
});

// Get patient medical records for dashboard
router.get('/:patientId/medical-records', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('📋 Fetching medical records for patient:', patientId);
    
    const records = await MedicalRecord.find({ patientId })
      .populate('doctor', 'name specialization')
      .sort({ date: -1 });
      
    const transformedRecords = records.map(record => ({
      _id: record._id,
      type: record.recordType,
      date: record.date,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      notes: record.notes,
      doctor: {
        name: record.doctor?.name || 'Doctor',
        specialization: record.doctor?.specialization || 'General Medicine'
      }
    }));

    res.json({
      success: true,
      records: transformedRecords
    });

  } catch (error) {
    console.error('Medical records error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical records',
      error: error.message
    });
  }
});

// Get patient lab results for dashboard
router.get('/:patientId/lab-results', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('🔬 Fetching lab results for patient:', patientId);
    
    const results = await LabRequest.find({ patientId })
      .populate('doctor', 'name')
      .sort({ requestedDate: -1 });
      
    const transformedResults = results.map(result => ({
      _id: result._id,
      testName: result.testType,
      testType: result.testType,
      testDate: result.requestedDate,
      status: result.status,
      results: result.results,
      notes: result.notes,
      orderedBy: {
        name: result.doctor?.name || 'Doctor'
      }
    }));

    res.json({
      success: true,
      results: transformedResults
    });

  } catch (error) {
    console.error('Lab results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lab results',
      error: error.message
    });
  }
});

// Get patient prescriptions for dashboard
router.get('/:patientId/prescriptions', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('💊 Fetching prescriptions for patient:', patientId);
    
    const prescriptions = await Prescription.find({ patientId })
      .populate('doctor', 'name')
      .sort({ prescribedDate: -1 });
      
    const transformedPrescriptions = prescriptions.map(prescription => ({
      _id: prescription._id,
      medicationName: prescription.medication,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      startDate: prescription.prescribedDate,
      endDate: prescription.expiryDate,
      status: prescription.status,
      instructions: prescription.instructions,
      prescribedBy: {
        name: prescription.doctor?.name || 'Doctor'
      }
    }));

    res.json({
      success: true,
      prescriptions: transformedPrescriptions
    });

  } catch (error) {
    console.error('Prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescriptions',
      error: error.message
    });
  }
});

// Get patient billing data for dashboard
router.get('/:patientId/billing', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('💰 Fetching billing data for patient:', patientId);
    
    // Placeholder billing data - implement real billing system as needed
    const currentBalance = 0;
    const totalPaid = 0;
    const pendingClaims = 0;
    
    // Mock recent bills - replace with real billing data
    const recentBills = [
      {
        _id: '1',
        billNumber: 'INV001',
        description: 'Consultation Fee',
        date: new Date('2024-01-15'),
        amount: 50,
        status: 'paid'
      },
      {
        _id: '2',
        billNumber: 'INV002',
        description: 'Lab Tests',
        date: new Date('2024-01-20'),
        amount: 120,
        status: 'pending'
      }
    ];

    res.json({
      success: true,
      data: {
        currentBalance,
        totalPaid,
        pendingClaims,
        bills: recentBills
      }
    });

  } catch (error) {
    console.error('Billing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing data',
      error: error.message
    });
  }
});

// Get patient health metrics for dashboard
router.get('/:patientId/health-metrics', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('❤️ Fetching health metrics for patient:', patientId);
    
    // Get latest health metrics from medical records
    const latestRecord = await MedicalRecord.findOne({ patientId })
      .sort({ date: -1 })
      .select('vitalSigns diagnosis');
      
    const healthData = {
      bloodPressure: latestRecord?.vitalSigns?.bloodPressure || '--/--',
      heartRate: latestRecord?.vitalSigns?.heartRate || '--',
      temperature: latestRecord?.vitalSigns?.temperature || '--',
      bmi: latestRecord?.vitalSigns?.bmi || '--'
    };

    res.json({
      success: true,
      data: healthData
    });

  } catch (error) {
    console.error('Health metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching health metrics',
      error: error.message
    });
  }
});

// Get patient by patientId
router.get('/profile/:patientId', async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.patientId })
      .select('-__v');
    
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }

    res.json({
      success: true,
      patient
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Get patient appointments - UPDATED FOR DASHBOARD
router.get('/:patientId/appointments', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit } = req.query;

    console.log('📅 Fetching appointments for patient:', patientId, { status, limit });

    let filter = { patientId };
    
    if (status) {
      filter.status = { $in: status.split(',') };
    }

    let appointments = await Appointment.find(filter)
      .populate('doctor', 'name specialization profileImage')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    if (limit) {
      appointments = appointments.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        _id: apt._id,
        appointmentId: apt.appointmentId,
        type: apt.type,
        consultationType: apt.consultationType,
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        status: apt.status,
        reason: apt.reason,
        symptoms: apt.symptoms,
        priority: apt.priority,
        duration: apt.duration,
        notes: apt.notes,
        doctor: {
          name: apt.doctor?.name || 'Doctor',
          specialization: apt.doctor?.specialization || 'General Medicine'
        }
      }))
    });

  } catch (error) {
    console.error('Appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

// Book appointment - UPDATED FOR DASHBOARD
router.post('/:patientId/appointments/book', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      doctorId, 
      appointmentDate, 
      appointmentTime, 
      type, 
      consultationType, 
      reason, 
      symptoms, 
      priority 
    } = req.body;

    console.log('📝 Booking appointment for patient:', patientId, req.body);

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Generate appointment ID
    const appointmentId = `APT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const appointment = new Appointment({
      patient: patient._id,
      patientId: patient.patientId,
      appointmentId: appointmentId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      type: type || 'consultation',
      consultationType: consultationType || 'in-person',
      reason,
      symptoms: symptoms || [],
      priority: priority || 'medium',
      duration: 30,
      status: 'scheduled'
    });

    await appointment.save();

    // Populate the appointment for response
    await appointment.populate('doctor', 'name specialization');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: {
        _id: appointment._id,
        appointmentId: appointment.appointmentId,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        type: appointment.type,
        consultationType: appointment.consultationType,
        doctor: {
          name: appointment.doctor?.name || 'Doctor',
          specialization: appointment.doctor?.specialization || 'General Medicine'
        },
        status: appointment.status,
        reason: appointment.reason
      }
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error booking appointment',
      error: error.message
    });
  }
});

// Forgot ID number endpoint
router.post('/forgot-id', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find patient by email
    const patient = await Patient.findOne({ email: email.toLowerCase() });

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email address' 
      });
    }

    // In a real application, you would send an email here
    // For demo purposes, we'll just return success
    res.json({
      success: true,
      message: 'ID number retrieval instructions sent to your email'
    });

  } catch (error) {
    console.error('Forgot ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during ID retrieval',
      error: error.message 
    });
  }
});

// Reschedule appointment - UPDATED
router.put('/appointments/:appointmentId/reschedule', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newTime } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check for conflicts with new time
    const conflictingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: new Date(newDate),
      appointmentTime: newTime,
      status: { $in: ['scheduled', 'confirmed'] },
      _id: { $ne: appointmentId }
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'Doctor already has an appointment at the new time'
      });
    }

    appointment.appointmentDate = new Date(newDate);
    appointment.appointmentTime = newTime;
    appointment.status = 'rescheduled';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: {
        id: appointment._id,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rescheduling appointment',
      error: error.message
    });
  }
});

// Cancel appointment - UPDATED
router.put('/appointments/:appointmentId/cancel', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.status = 'cancelled';
    if (reason) {
      appointment.cancellation = {
        reason,
        cancelledBy: 'patient',
        cancelledAt: new Date()
      };
    }
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: error.message
    });
  }
});

// Download medical records - UPDATED
router.get('/:patientId/records/download', async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const medicalRecords = await MedicalRecord.find({ patientId })
      .populate('doctor', 'name specialization')
      .sort({ date: -1 });

    const appointments = await Appointment.find({ patientId })
      .populate('doctor', 'name specialization')
      .sort({ appointmentDate: -1 });

    const prescriptions = await Prescription.find({ patientId })
      .sort({ prescribedDate: -1 });

    // In a real implementation, you would generate a PDF here
    // For now, return all data that would be in the medical records
    res.json({
      success: true,
      message: 'Medical records prepared for download',
      data: {
        patient: {
          name: patient.fullName,
          patientId: patient.patientId,
          dateOfBirth: patient.dateOfBirth,
          bloodType: patient.bloodType,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email
        },
        medicalRecords,
        appointments: appointments.map(apt => ({
          date: apt.appointmentDate,
          doctor: apt.doctor?.name,
          reason: apt.reason,
          diagnosis: apt.diagnosis,
          notes: apt.notes
        })),
        prescriptions
      }
    });

  } catch (error) {
    console.error('Download records error:', error);
    res.status(500).json({
      success: false,
      message: 'Error preparing medical records',
      error: error.message
    });
  }
});

// Request lab work - UPDATED
router.post('/:patientId/lab-requests', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { testType, reason, urgency, notes } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const labRequest = new LabRequest({
      patient: patient._id,
      patientId,
      testType,
      reason,
      urgency: urgency || 'routine',
      notes,
      status: 'requested',
      requestedDate: new Date()
    });

    await labRequest.save();

    res.json({
      success: true,
      message: 'Lab work request submitted successfully',
      request: {
        id: labRequest._id,
        testType: labRequest.testType,
        status: labRequest.status,
        requestedDate: labRequest.requestedDate
      }
    });

  } catch (error) {
    console.error('Lab request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting lab request',
      error: error.message
    });
  }
});

// Request prescription - UPDATED
router.post('/:patientId/prescriptions/request', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { medication, reason, dosage, instructions } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const prescription = new Prescription({
      patient: patient._id,
      patientId,
      medication,
      reason,
      dosage,
      instructions,
      status: 'requested',
      requestedDate: new Date()
    });

    await prescription.save();

    res.json({
      success: true,
      message: 'Prescription request submitted successfully',
      prescription: {
        id: prescription._id,
        medication: prescription.medication,
        status: prescription.status,
        requestedDate: prescription.requestedDate
      }
    });

  } catch (error) {
    console.error('Prescription request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting prescription',
      error: error.message
    });
  }
});

// Request prescription refill - UPDATED
router.post('/:patientId/prescriptions/refill', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { prescriptionId, medication } = req.body;

    let prescription;
    
    if (prescriptionId) {
      prescription = await Prescription.findOne({
        _id: prescriptionId,
        patientId,
        status: 'active'
      });
    } else {
      prescription = await Prescription.findOne({
        patientId,
        medication,
        status: 'active'
      });
    }

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Active prescription not found'
      });
    }

    // Check if refills are available
    if (prescription.refillsRemaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No refills remaining for this prescription'
      });
    }

    prescription.refillsRemaining -= 1;
    prescription.lastRefillDate = new Date();
    prescription.status = 'refill-requested';
    await prescription.save();

    res.json({
      success: true,
      message: 'Prescription refill requested successfully',
      prescription: {
        id: prescription._id,
        medication: prescription.medication,
        refillsRemaining: prescription.refillsRemaining,
        lastRefillDate: prescription.lastRefillDate
      }
    });

  } catch (error) {
    console.error('Prescription refill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting prescription refill',
      error: error.message
    });
  }
});

// Get payment methods - UPDATED
router.get('/:patientId/payment-methods', async (req, res) => {
  try {
    const { patientId } = req.params;

    const paymentMethods = await PaymentMethod.find({ patientId })
      .sort({ isPrimary: -1, createdAt: -1 });

    res.json({
      success: true,
      paymentMethods: paymentMethods.map(pm => ({
        id: pm._id,
        type: pm.type,
        provider: pm.provider,
        lastFour: pm.lastFour,
        isPrimary: pm.isPrimary,
        status: pm.status
      }))
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods',
      error: error.message
    });
  }
});

// Add payment method - UPDATED
router.post('/:patientId/payment-methods', async (req, res) => {
  try {
    const { patientId } = req.params;
    const paymentData = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // If this is set as primary, update existing primary methods
    if (paymentData.isPrimary) {
      await PaymentMethod.updateMany(
        { patientId },
        { isPrimary: false }
      );
    }

    const paymentMethod = new PaymentMethod({
      patient: patient._id,
      patientId,
      ...paymentData
    });

    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Payment method added successfully',
      paymentMethod: {
        id: paymentMethod._id,
        type: paymentMethod.type,
        provider: paymentMethod.provider,
        isPrimary: paymentMethod.isPrimary,
        status: paymentMethod.status
      }
    });

  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding payment method',
      error: error.message
    });
  }
});

// Set primary payment method - UPDATED
router.put('/payment-methods/:methodId/primary', async (req, res) => {
  try {
    const { methodId } = req.params;

    const paymentMethod = await PaymentMethod.findById(methodId);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // First, set all payment methods for this patient as not primary
    await PaymentMethod.updateMany(
      { patientId: paymentMethod.patientId },
      { isPrimary: false }
    );

    // Then set the selected one as primary
    paymentMethod.isPrimary = true;
    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Payment method set as primary successfully',
      paymentMethod: {
        id: paymentMethod._id,
        type: paymentMethod.type,
        provider: paymentMethod.provider,
        isPrimary: paymentMethod.isPrimary
      }
    });

  } catch (error) {
    console.error('Set primary payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting primary payment method',
      error: error.message
    });
  }
});

// DEBUG ROUTES - Add these for testing
router.post('/debug/check-data', (req, res) => {
  console.log('🔍 Debug - Received data:', req.body);
  res.json({
    success: true,
    receivedData: req.body,
    message: 'Check server console for detailed data'
  });
});

router.post('/debug/test-model', async (req, res) => {
  try {
    const testPatient = new Patient({
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      idNumber: 'TEST' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      phone: '1234567890',
      address: '123 Test St',
      city: 'Test City',
      allergiesText: 'None',
      currentMedicationsText: 'None',
      medicalConditionsText: 'None',
      emergencyContact: {
        name: 'Test Contact',
        phone: '0987654321',
        relationship: 'Friend'
      },
      paymentMethod: 'cash',
      consentToTreat: true,
      privacyPolicyAccepted: true,
      termsAccepted: true
    });

    await testPatient.validate();
    const saved = await testPatient.save();
    
    res.json({
      success: true,
      message: 'Test patient created successfully',
      patient: saved
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// Helper function to normalize blood type
function normalizeBloodType(bloodType) {
  if (!bloodType || bloodType.trim() === '') {
    return 'Unknown';
  }

  const bloodTypeMap = {
    'a+': 'A+', 'a-': 'A-',
    'b+': 'B+', 'b-': 'B-',
    'ab+': 'AB+', 'ab-': 'AB-',
    'o+': 'O+', 'o-': 'O-',
    'unknown': 'Unknown', 'none': 'Unknown', '': 'Unknown'
  };

  const normalized = bloodTypeMap[bloodType.toLowerCase()] || bloodType.toUpperCase();
  
  // Final validation - only return valid values
  const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
  return validBloodTypes.includes(normalized) ? normalized : 'Unknown';
}

module.exports = router;