const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import models (User model removed)
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

/**
 * Real Authentication Routes
 * Patient and Doctor authentication only
 */

// PATIENT AUTHENTICATION

// Patient registration
router.post('/patient/register', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      dateOfBirth,
      gender,
      address 
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, password, and phone are required'
      });
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new patient
    const patient = new Patient({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      gender,
      address,
      patientId: `PAT${Date.now()}` // Generate unique patient ID
    });

    await patient.save();

    // Create JWT token
    const token = jwt.sign(
      { 
        id: patient._id, 
        role: 'patient',
        type: 'patient'
      },
      process.env.JWT_SECRET || 'jijue_hospital_secret_key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Patient registration successful',
      token,
      user: {
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        role: 'patient',
        patientId: patient.patientId
      }
    });

  } catch (error) {
    console.error('Patient registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Patient login
router.post('/patient/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find patient by email
    const patient = await Patient.findOne({ email });
    if (!patient) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if patient account is active
    if (!patient.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated. Please contact hospital administration.'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: patient._id, 
        role: 'patient',
        type: 'patient'
      },
      process.env.JWT_SECRET || 'jijue_hospital_secret_key',
      { expiresIn: '24h' }
    );

    // Update last login
    patient.lastLogin = new Date();
    await patient.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        role: 'patient',
        patientId: patient.patientId,
        phone: patient.phone
      }
    });

  } catch (error) {
    console.error('Patient login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// DOCTOR AUTHENTICATION

// Doctor login
router.post('/doctor/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find doctor by email
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if doctor account is active
    if (!doctor.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated. Please contact hospital administration.'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: doctor._id, 
        role: 'doctor',
        type: 'doctor',
        department: doctor.department
      },
      process.env.JWT_SECRET || 'jijue_hospital_secret_key',
      { expiresIn: '24h' }
    );

    // Update last login
    doctor.lastLogin = new Date();
    await doctor.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        role: 'doctor',
        doctorId: doctor.doctorId,
        specialization: doctor.specialization,
        department: doctor.department,
        phone: doctor.phone
      }
    });

  } catch (error) {
    console.error('Doctor login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// STAFF AUTHENTICATION - DISABLED

// Staff login (nurses, receptionists, etc.) - TEMPORARILY DISABLED
router.post('/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Staff authentication temporarily disabled
    return res.status(501).json({
      success: false,
      message: 'Staff authentication is temporarily unavailable. Please use patient or doctor login.'
    });

  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// UNIVERSAL AUTHENTICATION ROUTES

// Verify token (works for all user types)
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jijue_hospital_secret_key');
    
    let user;
    
    // Find user based on role
    switch (decoded.role) {
      case 'patient':
        user = await Patient.findById(decoded.id).select('-password');
        break;
      case 'doctor':
        user = await Doctor.findById(decoded.id).select('-password');
        break;
      default:
        // For staff roles, return error since User model is not available
        return res.status(501).json({
          success: false,
          message: 'Staff authentication not implemented yet'
        });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid or account is inactive'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: decoded.role,
        ...(user.patientId && { patientId: user.patientId }),
        ...(user.doctorId && { doctorId: user.doctorId }),
        ...(user.specialization && { specialization: user.specialization }),
        ...(user.department && { department: user.department })
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jijue_hospital_secret_key');
    
    let user;
    
    // Find user based on role
    switch (decoded.role) {
      case 'patient':
        user = await Patient.findById(decoded.id).select('-password');
        break;
      case 'doctor':
        user = await Doctor.findById(decoded.id).select('-password');
        break;
      default:
        // For staff roles, return error
        return res.status(501).json({
          success: false,
          message: 'Staff profile access not implemented yet'
        });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account inactive'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: decoded.role,
        phone: user.phone,
        ...(user.patientId && { patientId: user.patientId }),
        ...(user.doctorId && { doctorId: user.doctorId }),
        ...(user.specialization && { specialization: user.specialization }),
        ...(user.department && { department: user.department }),
        ...(user.dateOfBirth && { dateOfBirth: user.dateOfBirth }),
        ...(user.gender && { gender: user.gender }),
        ...(user.address && { address: user.address })
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;