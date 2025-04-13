import express from 'express';
const router = express.Router();
import { newUser, allUsers, getUser, deleteUser } from '../controllers/user.controller.js';
import { AdminOnly } from '../middlewares/Protected.js';


router.post('/new', newUser);
router.get('/all',AdminOnly,  allUsers);
router.route('/:id').get(getUser).delete(AdminOnly, deleteUser);

export default router;
