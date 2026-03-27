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

import axios from 'axios';
import jwt from 'jsonwebtoken';

let adminToken: string | null = null;
let tokenExpiry: number = 0;

export async function getAdminToken(): Promise<string> {
    if (adminToken && Date.now() < tokenExpiry - 5000) {
        return adminToken;
    }

    const response = await axios.post(
        'http://keycloak:8080/realms/master/protocol/openid-connect/token',
        new URLSearchParams({
            grant_type: 'password',
            client_id: 'admin-cli',
            username: 'admin', // Keycloak admin username
            password: 'admin', // Keycloak admin password
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    adminToken = response.data.access_token as string;

    const decoded = jwt.decode(adminToken) as { exp?: number } | null;
    if (!decoded || !decoded.exp) {
        throw new Error('Failed to decode admin token');
    }
    tokenExpiry = decoded.exp * 1000;
    return adminToken;
}
