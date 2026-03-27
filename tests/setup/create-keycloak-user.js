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

const fetch = require('node-fetch');
const fs = require('fs');

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'jasminegraph';
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
const TEST_USER = {
  username: 'playwright-test-user',
  email: 'playwright-test-user@example.com',
  enabled: true,
  firstName: 'Playwright',
  lastName: 'Test',
  attributes: {
    role: ['admin'] 
  },
  credentials: [{
    type: 'password',
    value: 'playwrightTest123!',
    temporary: false
  }]
};

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForKeycloak(timeoutMs = 120000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${KEYCLOAK_BASE_URL}/`);
      if (res.ok) {
        console.log('Keycloak HTTP OK');
        return;
      }
    } catch (e) {
      console.log('Keycloak not ready yet:', e.message || e);
    }
    attempt++;
    // exponential backoff capped at 5s
    const backoff = Math.min(5000, 100 * Math.pow(2, attempt));
    await wait(backoff);
  }
  throw new Error(`Keycloak did not become ready within ${timeoutMs}ms`);
}

async function getAdminToken() {
  await waitForKeycloak();
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', 'admin-cli');
  params.append('username', KEYCLOAK_ADMIN_USER);
  params.append('password', KEYCLOAK_ADMIN_PASSWORD);

  const res = await fetch(`${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    body: params
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to get admin token: ' + JSON.stringify(data));
  return data.access_token;
}

async function createUser(token) {
  // Check if user exists
  let res = await fetch(`${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${TEST_USER.username}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  let users = await res.json();
  if (users.length > 0) {
    console.log('Test user already exists.');
    return users[0].id;
  }
  // Create user
  res = await fetch(`${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(TEST_USER)
  });
  if (res.status !== 201) {
    const err = await res.text();
    throw new Error('Failed to create user: ' + err);
  }
  // Get user id
  res = await fetch(`${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${TEST_USER.username}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  users = await res.json();
  return users[0].id;
}

async function main() {
  try {
    const adminToken = await getAdminToken();
    const userId = await createUser(adminToken);
    // Save credentials for Playwright
    fs.writeFileSync(__dirname + '/../utils/test-user.json', JSON.stringify({
      username: TEST_USER.username,
      password: TEST_USER.credentials[0].value
    }, null, 2));
    console.log('Test user ready:', TEST_USER.username);

    // Get access token for the test user
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', 'jasminegraph-api'); 
    params.append('username', TEST_USER.username);
    params.append('password', TEST_USER.credentials[0].value);
    const tokenRes = await fetch(`${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      body: params
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error('Failed to get user access token: ' + JSON.stringify(tokenData));
    const userAccessToken = tokenData.access_token;

    // Create a cluster for the test user
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8080';

    const clusterPayload = {
      name: 'TestCluster',
      description: 'Cluster created in setup',
      host: 'localhost',
      port: 1234
    };

    // Create cluster
    const createRes = await fetch(`${backendUrl}/clusters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAccessToken}`
      },
      body: JSON.stringify(clusterPayload)
    });
    if (!createRes.ok) {
      const text = await createRes.text();
      if (text.includes('duplicate key value')) {
        console.log('Cluster already exists — skipping creation.');
      } else {
        throw new Error('Failed to create cluster: ' + text);
      }
    }

    // Fetch all clusters for the user
    const listRes = await fetch(`${backendUrl}/clusters`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userAccessToken}`
      }
    });
    if (!listRes.ok) {
      const err = await listRes.text();
      throw new Error('Failed to fetch clusters: ' + err);
    }
    let clusters = await listRes.json();
    if (Array.isArray(clusters)) {
    } else if (clusters && Array.isArray(clusters.clusters)) {
      clusters = clusters.clusters;
    } else if (clusters && Array.isArray(clusters.data)) {
      clusters = clusters.data;
    } else {
      throw new Error('Unexpected clusters response format: ' + JSON.stringify(clusters));
    }
    const testClusters = clusters.filter(c => c.name === 'TestCluster');
    if (testClusters.length === 0) throw new Error('No TestCluster found after creation');
    testClusters.sort((a, b) => (b.id || 0) - (a.id || 0));
    const clusterData = testClusters[0];
    // Save cluster info for Playwright tests
    fs.writeFileSync(__dirname + '/../utils/test-cluster.json', JSON.stringify(clusterData, null, 2));
    console.log('Test cluster created for user:', clusterData);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
