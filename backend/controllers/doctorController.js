const Doctor = require('../models/Doctor');
const User = require('../models/User');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
exports.getDoctors = async (req, res, next) => {
    try {
        const { specialization, department, search } = req.query;

        let query = {};

        if (specialization) {
            query.specialization = specialization;
        }

        if (department) {
            query.department = department;
        }

        let doctors = await Doctor.find(query)
            .populate('user', 'name email phone profileImage')
            .populate('department', 'name description');

        if (search) {
            doctors = doctors.filter(doctor => 
                doctor.user.name.toLowerCase().includes(search.toLowerCase()) ||
                doctor.specialization.toLowerCase().includes(search.toLowerCase())
            );
        }

        res.status(200).json({
            success: true,
            count: doctors.length,
            data: doctors
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctor = async (req, res, next) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
            .populate('user', 'name email phone dateOfBirth gender address profileImage')
            .populate('department', 'name description contact');

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create doctor
// @route   POST /api/doctors
// @access  Private/Admin
exports.createDoctor = async (req, res, next) => {
    try {
        const doctor = await Doctor.create(req.body);

        res.status(201).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update doctor
// @route   PUT /api/doctors/:id
// @access  Private/Admin
exports.updateDoctor = async (req, res, next) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};