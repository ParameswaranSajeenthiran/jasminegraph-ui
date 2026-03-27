/**
Copyright 2025 JasmineGraph Team
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

CREATE TABLE IF NOT EXISTS kg_construction_meta (
                                      id SERIAL PRIMARY KEY,
                                      graph_id VARCHAR(255) NOT NULL,
                                      hdfs_ip VARCHAR(255) NOT NULL,
                                      hdfs_port INTEGER NOT NULL,
                                      hdfs_file_path TEXT NOT NULL,
                                      llm_runner_string JSONB NOT NULL,
                                      inference_engine VARCHAR(255) NOT NULL,
                                      model VARCHAR(255) NOT NULL,
                                      chunk_size INTEGER NOT NULL,
                                      status VARCHAR(20) CHECK (status IN ('pending','running','paused','completed','failed','stopped')) NOT NULL DEFAULT 'pending',
                                      user_id VARCHAR(255),
                                      message TEXT DEFAULT '',
                                      cluster_id VARCHAR(255) NOT NULL,
                                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

