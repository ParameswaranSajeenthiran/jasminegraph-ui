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

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { TIMEOUT } from './constants/constants';

dotenv.config();

const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not set in .env");
}

const pool = new Pool({
  connectionString: POSTGRES_URL,
});

const connectToDatabase = async () => {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Postgres connected');
      return;
    } catch (error) {
      console.log(`Postgres connection failed (attempt ${retries + 1}). Retrying...`);
      await new Promise(res => setTimeout(res, TIMEOUT.retryDelayMs)); // wait 3 sec
      retries++;
    }
  }

  throw new Error("Postgres connection failed after several retries");
};

export { connectToDatabase, pool };
