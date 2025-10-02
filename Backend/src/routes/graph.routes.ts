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
import { getGraphList, uploadGraph, removeGraph, triangleCount, getGraphVisualization, getGraphData, getClusterProperties, getDataFromHadoop } from '../controllers/graph.controller';
import multer from 'multer';
import path from 'path';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/home/kopimenan/FYP_Fork/jasminegraph/env/data'); // Specify the folder to save files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Save file with a unique name
  }
});

const upload = multer({ storage: storage });

const graphRoute = () => {
  // console.log('Called');
  const router = Router();

  router.get('/list', getGraphList);
  router.post('/upload', upload.single("file"), uploadGraph);
  router.delete('/:id', removeGraph);
  router.post('/analyze/trianglecount', triangleCount)
  router.get('/visualize', getGraphVisualization);
  router.get('/data', getGraphData)
  router.get('/info', getClusterProperties);
  router.get('/hadoop', getDataFromHadoop);

  return router;
};

export { graphRoute };
