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

import { Request, Response } from 'express';

import { HTTP } from '../constants/constants';
import { extractErrorDetails } from '../utils/error-handler';
import axios from 'axios';
import { getAdminToken } from '../utils/keycloak-admin-token';

const registerAdminUser = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !firstName || !lastName || !password) {
    return res.status(HTTP[422]).json({ message: 'Email address, first name, last name, and password are required' });
  }

  try {
    const adminToken = await getAdminToken();
    const keycloakResponse = await axios.post(
      `http://keycloak:8080/admin/realms/jasminegraph/users`,
      {
        username: email,
        email,
        firstName: firstName,
        lastName: lastName,
        enabled: true,
        credentials: [{ type: 'password', value: password, temporary: false }],
        attributes: { role: ['admin'] }
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (keycloakResponse.status === 201) {
      console.log(`[REGISTER ADMIN USER] Admin user ${email} created successfully`);
      return res.status(HTTP[200]).json({ firstName: firstName, lastName: lastName, email, role: 'admin' });
    } else {
      console.error('[REGISTER ADMIN USER] Failed to create user', keycloakResponse.data);
      return res.status(400).json({ message: 'Failed to create admin user in Keycloak' });
    }
  } catch (err: any) {
    const errorDetails = extractErrorDetails(err, 'REGISTER ADMIN USER');
    return res.status(500).json({
      message: 'Failed to register admin user.',
      error: errorDetails
    });
  }
};

const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const adminToken = await getAdminToken();
    const response = await axios.get(
      `http://keycloak:8080/admin/realms/jasminegraph/users`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const users = response.data;

    const usersDetails = users.map((user: any) => {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: user.enabled,
        role: user.attributes?.role?.[0],
      };
    });

    return res.status(HTTP[200]).json({ data: usersDetails });
  } catch (err: any) {
    const errorDetails = extractErrorDetails(err, 'GET ALL USERS');
    return res.status(HTTP[500]).json({
      message: 'Failed to fetch users.',
      error: errorDetails,
    });
  }
};

const getUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const adminToken = await getAdminToken();
    const response = await axios.get(
      `http://keycloak:8080/admin/realms/jasminegraph/users/${id}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (!response.data) {
      return res.status(HTTP[404]).json({ message: `User with id "${id}" not found.` });
    }

    return res.status(HTTP[200]).json({ data: response.data });
  } catch (err: any) {
    const errorDetails = extractErrorDetails(err, 'GET USER');
    return res.status(HTTP[500]).json({
      message: `Unable to fetch user with id "${id}". Please check if the user exists or try again later.`,
      error: errorDetails
    });
  }
};

const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { enabled, firstName, lastName, role } = req.body;

  if (!firstName || !lastName || !role) {
    return res.status(HTTP[422]).json({ message: 'The fields first name, last name, and role are required' });
  }

  try {
    const adminToken = await getAdminToken();

    const updatePayload: any = {
      enabled,
      firstName: firstName,
      lastName: lastName,
      attributes: { role: [role] }
    };

    await axios.put(
      `http://keycloak:8080/admin/realms/jasminegraph/users/${id}`,
      updatePayload,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const updatedUserResponse = await axios.get(
      `http://keycloak:8080/admin/realms/jasminegraph/users/${id}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    return res.status(HTTP[200]).json({ data: updatedUserResponse.data });
  } catch (err: any) {
    const errorDetails = extractErrorDetails(err, 'UPDATE USER');
    return res.status(HTTP[500]).json({
      message: `Failed to update user with id "${id}".`,
      error: errorDetails
    });
  }
};

const getUserByToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(HTTP[401]).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(HTTP[401]).json({ message: 'Bearer token missing' });
    }

    const userInfoResponse = await axios.get(
      'http://keycloak:8080/realms/jasminegraph/protocol/openid-connect/userinfo',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const userInfo = userInfoResponse.data;
    const userId = userInfo.sub;

    const adminToken = await getAdminToken();
    const userDetailsResponse = await axios.get(
      `http://keycloak:8080/admin/realms/jasminegraph/users/${userId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const userDetails = userDetailsResponse.data;

    return res.status(HTTP[200]).json({
      data: {
        id: userDetails.id,
        username: userDetails.username,
        email: userDetails.email,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        enabled: userDetails.enabled,
        role: userDetails.attributes.role[0],
      }
    });
  } catch (err: any) {
    console.error('[GET USER BY TOKEN] Error:', err.response?.data || err.message);
    return res.status(HTTP[401]).json({ message: 'Invalid or expired token' });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const adminToken = await getAdminToken();
    await axios.delete(
      `http://keycloak:8080/admin/realms/jasminegraph/users/${id}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    return res.status(HTTP[200]).json({ message: `User deleted successfully. ID: ${id}` });
  } catch (err: any) {
    const errorDetails = extractErrorDetails(err, 'DELETE USER');
    return res.status(HTTP[500]).json({
      message: `Failed to delete user with id "${id}".`,
      error: errorDetails
    });
  }
};

export { registerAdminUser, deleteUser, getAllUsers, getUser, updateUser, getUserByToken };
