import { Router } from 'express';
import * as groups from '../controllers/groups.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import {
  createGroupSchema,
  addGroupMembersSchema,
  updateMemberRoleSchema,
  groupMessageSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', groups.getGroups);
router.post('/', validate(createGroupSchema), groups.createGroup);
router.get('/:id', groups.getGroup);
router.patch('/:id', groups.updateGroup);
router.delete('/:id', groups.deleteGroup);
router.post('/:id/avatar', upload.single('avatar'), groups.uploadGroupAvatar);
router.post('/:id/members', validate(addGroupMembersSchema), groups.addMembers);
router.delete('/:id/members/:userId', groups.removeMember);
router.patch('/:id/members/:userId/role', validate(updateMemberRoleSchema), groups.updateMemberRole);
router.post('/:id/leave', groups.leaveGroup);
router.get('/:id/messages', groups.getGroupMessages);
router.post('/:id/messages', validate(groupMessageSchema), groups.sendGroupMessage);

export default router;
