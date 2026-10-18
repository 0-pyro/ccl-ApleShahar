import express from 'express';
import upload from '../middleware/UploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  submitFacilityRequest,
  getAllFacilityRequestsHandler,
  getMyFacilityRequestsHandler,
  getFacilityRequestByIdHandler,
  getWardFacilityRequestsHandler,
  updateFacilityStatusHandler
} from '../controllers/facilityController.js';

const router = express.Router();

// Public
router.get('/', getAllFacilityRequestsHandler);

// citizen
router.get('/my', protect, authorize('citizen'), getMyFacilityRequestsHandler);

// authority
router.get('/ward/:ward_no', protect, authorize('authority'), getWardFacilityRequestsHandler);

router.get('/:id', getFacilityRequestByIdHandler);

// Citizen — image upload
router.post('/', protect, authorize('citizen'), upload.single('image'), submitFacilityRequest);

// Authority — approve or reject
router.patch('/:id/status', protect, authorize('authority'), updateFacilityStatusHandler);

export default router;