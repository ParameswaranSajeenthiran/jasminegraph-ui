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

// Utility: login and go to clusters page
async function loginAndGoToClusters(page) {
  const { username, password } = getTestUser();
  await page.goto('/auth');
  await page.getByLabel('Email').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/\/clusters/);
  await expect(page.getByRole('heading', { name: 'My Clusters' })).toBeVisible();
}

test.describe('Cluster Management Integration', () => {
  test('should create, list, select, and view cluster details', async ({ page }) => {
    await loginAndGoToClusters(page);

  // Use the cluster created in setup
  const { name: clusterName, id: clusterId } = require('../../utils/test-user-util').getTestCluster();

  // List clusters: check that the cluster appears in "All Clusters"
  await expect(page.getByText('All Clusters')).toBeVisible();
  // Find the cluster card by matching both name and ID
  const cardLocator = page.locator('.ant-card').filter({
    has: page.getByRole('heading', { name: clusterName, exact: true }),
    hasText: `Cluster ID: ${clusterId}`
  });
  const clusterHeading = cardLocator.getByRole('heading', { name: clusterName, exact: true });
  await expect(clusterHeading).toBeVisible();

  // Select the cluster
  await cardLocator.getByRole('button', { name: /select/i }).click();
  await expect(page.getByText('Selected Cluster')).toBeVisible();
  await expect(clusterHeading).toBeVisible();

  // View cluster details (click cluster name)
  await clusterHeading.click();
  await expect(page).toHaveURL(/\/clusters\//);
  await expect(page.getByText(clusterName)).toBeVisible();
  });
});
