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

// Playwright global setup to create Keycloak user before tests
const { execSync } = require('child_process');
const { chromium } = require('@playwright/test');
const { getTestUser } = require('../utils/test-user-util');
const path = require('path');

module.exports = async () => {
  try {
    execSync('node setup/create-keycloak-user.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to create Keycloak test user:', e);
    process.exit(1);
  }

  // Log in and save storage state for reuse in all tests
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const { username, password } = getTestUser();
  await page.goto(process.env.BASE_URL ? `${process.env.BASE_URL}/auth` : 'http://localhost:3000/auth');
  await page.getByLabel('Email').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL('**/clusters');
  // Save storage state (includes localStorage with access token)
  await page.context().storageState({ path: path.join(__dirname, 'storageState.json') });
  await browser.close();
};
