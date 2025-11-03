// backend/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
// REMOVED: const auth = require('../middleware/auth');
// REMOVED: const adminAuth = require('../middleware/adminAuth');

// GET /api/departments - Get all departments
router.get('/', async (req, res) => {
    try {
        const { active, emergency, floor } = req.query;
        
        let filter = {};
        
        // Filter by active status
        if (active === 'true') {
            filter.isActive = true;
            filter.status = 'active';
        }
        
        // Filter by emergency services
        if (emergency === 'true') {
            filter['operatingHours.emergency'] = true;
        }
        
        // Filter by floor
        if (floor) {
            filter.$or = [
                { floor: floor },
                { 'contact.floor': floor }
            ];
        }

        const departments = await Department.find(filter)
            .populate('headOfDepartment', 'name specialization profileImage')
            .select('-__v')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching departments',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/departments/active - Get active departments only
router.get('/active', async (req, res) => {
    try {
        const departments = await Department.findActive();
        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error('Error fetching active departments:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching active departments',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/departments/emergency - Get emergency departments
router.get('/emergency', async (req, res) => {
    try {
        const departments = await Department.findEmergencyDepartments();
        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error('Error fetching emergency departments:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching emergency departments',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/departments/:id - Get single department
router.get('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('headOfDepartment', 'name specialization profileImage yearsOfExperience')
            .populate('headDoctor', 'name specialization profileImage')
            .select('-__v');

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        res.json({
            success: true,
            data: department
        });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching department',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/departments/code/:code - Get department by code
router.get('/code/:code', async (req, res) => {
    try {
        const department = await Department.findOne({ 
            departmentCode: req.params.code.toUpperCase() 
        })
        .populate('headOfDepartment', 'name specialization profileImage')
        .select('-__v');

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        res.json({
            success: true,
            data: department
        });
    } catch (error) {
        console.error('Error fetching department by code:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching department',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// POST /api/departments - Create new department
router.post('/', async (req, res) => {
    try {
        const departmentData = req.body;

        // Check if department already exists with same name
        const existingDepartment = await Department.findOne({
            name: { $regex: new RegExp(`^${departmentData.name}$`, 'i') }
        });

        if (existingDepartment) {
            return res.status(400).json({
                success: false,
                message: 'Department with this name already exists'
            });
        }

        const department = new Department(departmentData);
        await department.save();

        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: department
        });
    } catch (error) {
        console.error('Error creating department:', error);
        
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
            message: 'Server error while creating department',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// PUT /api/departments/:id - Update department
router.put('/:id', async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        res.json({
            success: true,
            message: 'Department updated successfully',
            data: department
        });
    } catch (error) {
        console.error('Error updating department:', error);
        
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
            message: 'Server error while updating department',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// DELETE /api/departments/:id - Delete department
router.delete('/:id', async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            { 
                isActive: false,
                status: 'inactive'
            },
            { new: true }
        );

        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        res.json({
            success: true,
            message: 'Department deactivated successfully',
            data: { id: department._id, name: department.name, status: department.status }
        });
    } catch (error) {
        console.error('Error deactivating department:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deactivating department',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/departments/:id/doctors - Get doctors in a department
router.get('/:id/doctors', async (req, res) => {
    try {
        const { available, specialization } = req.query;
        
        let filter = { 
            department: req.params.id,
            status: 'active'
        };
        
        if (available === 'true') {
            filter.isAvailable = true;
        }
        
        if (specialization) {
            filter.specialization = specialization;
        }

        const doctors = await Doctor.find(filter)
            .select('doctorId name specialization profileImage yearsOfExperience rating consultationFee bio languages isAvailable')
            .sort({ 'rating.average': -1, yearsOfExperience: -1 });

        res.json({
            success: true,
            data: doctors
        });
    } catch (error) {
        console.error('Error fetching department doctors:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching department doctors',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// POST /api/departments/:id/services - Add service to department
router.post('/:id/services', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        await department.addService(req.body);

        res.json({
            success: true,
            message: 'Service added successfully',
            data: department.services
        });
    } catch (error) {
        console.error('Error adding service:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding service',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/departments/:id/availability - Check if department is open
router.get('/:id/availability', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        
        if (!department) {
            return res.status(404).json({
                success: false,
                message: 'Department not found'
            });
        }

        const isOpen = department.isOpenNow();

        res.json({
            success: true,
            data: {
                isOpen,
                currentStatus: department.currentStatus,
                operatingHours: department.formattedHours,
                emergency: department.operatingHours.emergency
            }
        });
    } catch (error) {
        console.error('Error checking department availability:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while checking availability',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;