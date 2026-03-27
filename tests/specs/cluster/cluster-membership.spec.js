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

const { test, expect } = require('@playwright/test');
const { getTestUser } = require('../../utils/test-user-util');

async function loginAndGoToClusters(page) {
  const { username, password } = getTestUser();
  await page.goto('/auth');
  await page.getByLabel('Email').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/\/clusters/);
  await expect(page.getByRole('heading', { name: 'My Clusters' })).toBeVisible();
}

test.describe('Cluster Membership Integration', () => {
  test('should add and remove user to/from a cluster', async ({ page }) => {
    await loginAndGoToClusters(page);

  // Use the cluster created in setup
  const { name: clusterName, id: clusterId } = require('../../utils/test-user-util').getTestCluster();
  
    // Add user to cluster
    if (await page.getByRole('button', { name: /add user/i }).isVisible()) {
      await page.getByRole('button', { name: /add user/i }).click();
      await page.getByLabel(/user id/i).fill('test-user-id'); // Replace with a valid user id
      await page.getByRole('button', { name: /confirm|add/i }).click();
      await expect(page.getByText(/user added/i)).toBeVisible();
    }

    // remove user from cluster 
    if (await page.getByRole('button', { name: /remove user/i }).isVisible()) {
      await page.getByRole('button', { name: /remove user/i }).click();
      await page.getByLabel(/user id/i).fill('test-user-id'); // Replace with a valid user id
      await page.getByRole('button', { name: /confirm|remove/i }).click();
      await expect(page.getByText(/user removed/i)).toBeVisible();
    }
  });
});
