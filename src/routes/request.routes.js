// src/routes/request.routes.js
import { Router } from 'express';
import {
  showForm,
  sendMessage,
  listMessages,
  showEditForm,
  updateMessage,
  deleteMessage,
} from '../controllers/request.controller.js';

const router = Router();

router.get('/', showForm);
router.post('/send', sendMessage);
router.get('/messages', listMessages);
router.get('/messages/:id/edit', showEditForm);
router.post('/messages/:id/edit', updateMessage);
router.post('/messages/:id/delete', deleteMessage);

export default router;
