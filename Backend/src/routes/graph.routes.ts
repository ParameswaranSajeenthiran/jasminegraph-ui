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
import {
    getGraphList, uploadGraph, removeGraph, triangleCount, getGraphVisualization, getGraphData, getClusterProperties,
    getDataFromHadoop, constructKG, stopConstructKG,
    updateKGConstructionMetaByClusterId, getKGConstructionMetaByGraphId, getOnProgressKGConstructionMeta, validateHDFS
} from '../controllers/graph.controller';
import multer from 'multer';
import path from 'path';
import fs from "fs";
import { PDFParse } from 'pdf-parse';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'app/caches/'); // Specify the folder to save files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Save file with a unique name
  }
});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'app/caches/text/'); // Specify the folder to save files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Save file with a unique name
  }
});

const upload = multer({ storage: storage });

const upload_file = multer({ storage: fileStorage });


const textExtract = async (req: Request, res: Response) => {

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const customName = req.body.textFileName;
    if (!customName) {
      return res.status(400).json({ error: "Missing textFileName" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".pdf" && ext !== ".txt") {
      return res.status(400).json({ error: "Only .txt or .pdf allowed" });
    }

    const finalFilename = customName + ext;
    const finalPath = path.join(UPLOAD_DIR, finalFilename);

    if (fs.existsSync(finalPath)) {
      console.log("Duplicate file found:", finalFilename);

      let existingContent = "";

      if (ext === ".txt") {
        existingContent = fs.readFileSync(finalPath, "utf8");
      } else {
        const pdfData = fs.readFileSync(finalPath);
        const parser = new PDFParse(new Uint8Array(pdfData));

        const parsed = await parser.getText();
        existingContent = parsed.text;
        await parser.destroy();

      }

      return res.json({
        status: "duplicate",
        filename: finalFilename,
        extractedText: existingContent
      });
    }

    // ----------------------------------------------------
    // STEP B: MOVE FILE FROM TMP → UPLOADS
    // ----------------------------------------------------
    fs.renameSync(req.file.path, finalPath);

    // ----------------------------------------------------
    // STEP C: TEXT EXTRACTION
    // ----------------------------------------------------
    let extractedText = "";

    if (ext === ".txt") {
      extractedText = fs.readFileSync(finalPath, "utf8");
    } else {
      const pdfBuffer = fs.readFileSync(finalPath);
      const parser = new PDFParse(new Uint8Array(pdfBuffer));

      const parsed = await parser.getText();
      extractedText = parsed.text;
      await parser.destroy();



    }
    const textFilePath = path.join(UPLOAD_DIR, customName + ".txt");
    fs.writeFileSync(textFilePath, extractedText, "utf8");



    // ----------------------------------------------------
    // STEP D: RETURN SUCCESS
    // ----------------------------------------------------
    return res.json({
      status: "success",
      filename: finalFilename
    });

  } catch (err) {
    console.error("Extraction error:", err);
    return res.status(500).json({ error: "Server error" });
  }

};
const graphRoute = () => {
  const router = Router();

  router.get('/list', getGraphList);
  router.post('/upload', upload.single("file"), uploadGraph);
  router.delete('/:id', removeGraph);
  router.post('/analyze/trianglecount', triangleCount)
  router.get('/visualize', getGraphVisualization);
  router.get('/data', getGraphData)
  router.get('/info', getClusterProperties)
  router.get('/hadoop', getDataFromHadoop);
  router.post('/hadoop/validate-file', validateHDFS)
  router.post('/hadoop/construct-kg', constructKG);
  router.post('/hadoop/stop-construct-kg', stopConstructKG);

  router.get('/construct-kg-meta', getKGConstructionMetaByGraphId);
  router.get('/construct-kg-meta/progress', getOnProgressKGConstructionMeta);
  router.put('/construct-kg-meta', updateKGConstructionMetaByClusterId);

  router.post('/fileupload',upload_file.single("file"),textExtract);

  return router;
};

export { graphRoute };
