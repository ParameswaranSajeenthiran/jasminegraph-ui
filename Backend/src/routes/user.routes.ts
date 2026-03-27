/**
Copyright 2024 JasmineGraph Team
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

import { Router } from 'express';
import { registerAdminUser, deleteUser, getAllUsers, getUser, updateUser, getUserByToken } from '../controllers/user.controller';

const userRoute = () => {
  const router = Router();

  router.get('/', getAllUsers);
  router.get('/token', getUserByToken)
  router.post('/admin', registerAdminUser);
  router.get('/:id', getUser);
  router.patch('/:id', updateUser);
  router.delete('/:id', deleteUser);

  return router;
};

export { userRoute };
