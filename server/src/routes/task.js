import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as taskController from '../controllers/taskController.js';
import { createTaskSchema, updateTaskSchema, taskIdSchema, reorderTasksSchema, moveTaskSchema, quickAddTaskSchema, listTasksQuerySchema } from '../validators/task.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/', validate(listTasksQuerySchema), taskController.listTasks);
router.get('/board', taskController.getBoardTasks);
router.post('/quick', validate(quickAddTaskSchema), taskController.quickAddTask);
router.patch('/reorder', validate(reorderTasksSchema), taskController.reorderTasks);
router.patch('/move', validate(moveTaskSchema), taskController.moveTask);
router.get('/:id', validate(taskIdSchema), taskController.getTask);
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);
router.patch('/:id/toggle', validate(taskIdSchema), taskController.toggleTaskDone);
router.delete('/:id', validate(taskIdSchema), taskController.deleteTask);

export default router;