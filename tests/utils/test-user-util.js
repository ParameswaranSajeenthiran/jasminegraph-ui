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

const fs = require('fs');
const path = require('path');

function getTestUser() {
  const file = path.join(__dirname, 'test-user.json');
  if (!fs.existsSync(file)) throw new Error('test-user.json not found. Run global setup first.');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function getTestCluster() {
  const file = path.join(__dirname, 'test-cluster.json');
  if (!fs.existsSync(file)) throw new Error('test-cluster.json not found. Run global setup first.');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

module.exports = { getTestUser, getTestCluster };
