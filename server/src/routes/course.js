import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as courseController from '../controllers/courseController.js';
import { createCourseSchema, updateCourseSchema, courseIdSchema } from '../validators/course.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createCourseSchema), courseController.createCourse);
router.get('/', courseController.listCourses);
router.get('/:id', validate(courseIdSchema), courseController.getCourse);
router.patch('/:id', validate(updateCourseSchema), courseController.updateCourse);
router.delete('/:id', validate(courseIdSchema), courseController.deleteCourse);

export default router;