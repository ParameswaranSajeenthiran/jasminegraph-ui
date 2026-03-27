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

export interface IClusterDetails {
  id: number;
  name: string;
  description: string;
  host: string;
  port: number;
  user_ids: string[];
  cluster_owner: string;
  created_at: string;
  updated_at: string;
}

export interface IClusterProperties {
  partitionCount: number;
  version: string;
  workersCount: number;
}
