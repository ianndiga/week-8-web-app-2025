const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const User = require('../models/User');

/**
 * Universal authentication middleware for hospital system
 * Handles Patient, Doctor, and Staff authentication
 */
const auth = async (req, res, next) => {
    try {
        let token;

        // Extract token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.headers.authorization) {
            token = req.headers.authorization.replace('Bearer ', '');
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hospital_jwt_secret_key');
        
        let user;
        let userModel;

        // Find user based on role and type from token
        switch (decoded.role) {
            case 'patient':
                user = await Patient.findById(decoded.id).select('-password');
                userModel = 'patient';
                break;
            case 'doctor':
                user = await Doctor.findById(decoded.id).select('-password');
                userModel = 'doctor';
                break;
            default:
                // Staff roles: nurse, receptionist, lab_technician, etc.
                user = await User.findById(decoded.id).select('-password');
                userModel = 'staff';
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }

        // Check if account is active
        if (user.isActive === false) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact administration.'
            });
        }

        // Set user data in request
        req.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: decoded.role,
            phone: user.phone,
            userModel: userModel,
            // Add role-specific fields
            ...(user.patientId && { patientId: user.patientId }),
            ...(user.doctorId && { doctorId: user.doctorId }),
            ...(user.staffId && { staffId: user.staffId }),
            ...(user.specialization && { specialization: user.specialization }),
            ...(user.department && { department: user.department })
        };

        // Also set the full user object for compatibility
        req.userObject = user;
        
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        
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
            message: 'Authentication failed'
        });
    }
};

/**
 * Role-based authorization middleware
 * @param {...String} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`
            });
        }
        next();
    };
};

/**
 * Patient-only middleware
 */
const patientOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'patient') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Patient privileges required.'
        });
    }
    next();
};

/**
 * Doctor-only middleware
 */
const doctorOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'doctor') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Doctor privileges required.'
        });
    }
    next();
};

/**
 * Staff-only middleware (nurses, receptionists, lab technicians)
 */
const staffOnly = (req, res, next) => {
    const staffRoles = ['nurse', 'receptionist', 'lab_technician'];
    if (!req.user || !staffRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Staff privileges required.'
        });
    }
    next();
};

/**
 * Medical staff only (doctors and nurses)
 */
const medicalStaffOnly = (req, res, next) => {
    const medicalRoles = ['doctor', 'nurse'];
    if (!req.user || !medicalRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Medical staff privileges required.'
        });
    }
    next();
};

/**
 * Receptionist or higher (receptionists, nurses, doctors)
 */
const receptionistOrHigher = (req, res, next) => {
    const allowedRoles = ['receptionist', 'nurse', 'doctor'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Receptionist or higher privileges required.'
        });
    }
    next();
};

/**
 * Department-based access control
 * @param {...String} departments - Allowed departments
 */
const requireDepartment = (...departments) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Patients don't have departments, so allow if no department required
        if (req.user.role === 'patient') {
            return next();
        }

        if (!req.user.department || !departments.includes(req.user.department)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required department: ${departments.join(', ')}`
            });
        }
        next();
    };
};

/**
 * Optional: Check if user can access specific patient data
 * Useful for doctors/nurses accessing patient records
 */
const canAccessPatient = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Patients can access their own data
    if (req.user.role === 'patient' && req.user.id === req.params.patientId) {
        return next();
    }

    // Medical staff can access patient data
    const medicalRoles = ['doctor', 'nurse'];
    if (medicalRoles.includes(req.user.role)) {
        return next();
    }

    // Receptionists might have limited access
    if (req.user.role === 'receptionist') {
        // Add specific logic for receptionist patient access
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied to patient data'
    });
};

module.exports = {
    auth,                   // Universal authentication
    authorize,              // Role-based authorization
    patientOnly,            // Patients only
    doctorOnly,             // Doctors only
    staffOnly,              // Staff only
    medicalStaffOnly,       // Doctors and nurses
    receptionistOrHigher,   // Receptionist or higher
    requireDepartment,      // Department-based access
    canAccessPatient        // Patient data access control
};