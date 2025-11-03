// backend/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// Get all services with filtering
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let filter = {};
    
    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const services = await Service.find(filter)
      .select('name category description duration price specialistsCount successRate features icon detailedDescription procedures requirements')
      .sort({ name: 1 });

    res.json({
      success: true,
      services: services.map(service => ({
        _id: service._id,
        name: service.name,
        category: service.category,
        description: service.description,
        duration: service.duration,
        price: service.price,
        specialistsCount: service.specialistsCount,
        successRate: service.successRate,
        features: service.features,
        icon: service.icon,
        detailedDescription: service.detailedDescription,
        procedures: service.procedures,
        requirements: service.requirements
      }))
    });

  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services'
    });
  }
});

// Get available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Service.distinct('category');
    
    res.json({
      success: true,
      categories: categories.map(category => ({
        value: category.toLowerCase(),
        name: category
      }))
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

// Get single service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      service: {
        _id: service._id,
        name: service.name,
        category: service.category,
        description: service.description,
        detailedDescription: service.detailedDescription,
        duration: service.duration,
        price: service.price,
        specialistsCount: service.specialistsCount,
        successRate: service.successRate,
        features: service.features,
        icon: service.icon,
        procedures: service.procedures,
        requirements: service.requirements,
        testimonials: service.testimonials,
        images: service.images,
        consultationFee: service.consultationFee,
        insuranceCovered: service.insuranceCovered
      }
    });

  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service'
    });
  }
});

module.exports = router;