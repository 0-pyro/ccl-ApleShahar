import express from 'express';
import upload from '../middleware/UploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
  submitComplaint,
  getAllComplaintsHandler,
  getMyComplaintsHandler,
  getComplaintByIdHandler,
  getWardComplaintsHandler,
  updateStatusHandler,
  resolveComplaintHandler,
  citizenSatisfactionHandler
} from '../controllers/complaintsController.js';

const router = express.Router();

// Public
router.get('/', getAllComplaintsHandler);

// citizen
router.get('/my', protect, authorize('citizen'), getMyComplaintsHandler);

//  authority
router.get('/ward/:ward_no', protect, authorize('authority'), getWardComplaintsHandler);

router.get('/:id', getComplaintByIdHandler);

// Post — citizen only
router.post('/', protect, authorize('citizen'), upload.single('image'), submitComplaint);

// Patch — authority only
router.patch('/:id/status', protect, authorize('authority'), updateStatusHandler);
router.patch('/:id/resolve', protect, authorize('authority'), upload.single('image'), resolveComplaintHandler);

// Patch — citizen only
router.patch('/:id/satisfaction', protect, authorize('citizen'), citizenSatisfactionHandler);

export default router;