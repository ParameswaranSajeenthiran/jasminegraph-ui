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

import axios, { AxiosResponse } from "axios";
import { authApi } from "./axios";

interface ApiResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  message: string;
}

export async function pingBackend(){
  try {
    const result: AxiosResponse<any> = await axios({
      method: "get",
      url: "/backend/ping",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (result.data.message === "pong") {
      return true;
    }
    return false;
  } catch (err: any) {
    return false;
  }
}

export async function checkBackendHealth() {
  try {
    const result: AxiosResponse<any> = await axios({
      method: "get",
      url: "/backend/health",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return result.status === 200 && result.data.status === "ok";
  } catch (err: any) {
    return false;
  }
}

export async function userLogin(username: string, password: string){
  try {
    const result: AxiosResponse<any> = await axios({
      method: "post",
      url: "/backend/auth/login",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        email: username,
        password,
      },
    });

    return {
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken
    };
  } catch (err: any) {
    if (err.response) {
      return {
        message: err.response.data.message,
      };
    } else {
      return Promise.reject();
    }
  }
}

export async function registerAdmin(firstName: string, lastName: string, email: string, password: string): Promise<ApiResponse<string> | ApiErrorResponse> {
  try {
    const result: AxiosResponse<any> = await axios({
      method: "post",
      url: "/backend/users/admin",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        firstName: firstName,
        lastName: lastName,
        email,
        password,
      },
    });

    return {
      data: result.data,
    };
  } catch (err: any) {
    if (err.response) {
      return {
        message: err.response.data.message,
      };
    } else {
      return Promise.reject();
    }
  }
}

export async function registerUser(firstName: string, lastName: string, email: string, password: string, role: string): Promise<ApiResponse<string> | ApiErrorResponse> {
  try {
    const result: AxiosResponse<any> = await axios({
      method: "post",
      url: "/backend/auth/register",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        firstName: firstName,
        lastName: lastName,
        email,
        password,
        role
      },
    });

    return {
      data: result.data,
    };
  } catch (err: any) {
    if (err.response) {
      return {
        message: err.response.data.message,
      };
    } else {
      return Promise.reject();
    }
  }
}


export async function getUserDataByToken(token: string){
  try {
    const result: AxiosResponse<any> = await axios({
      method: "get",
      url: "/backend/users/token",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
    });

    return {
      data: result.data,
    };
  } catch (err: any) {
      return Promise.reject();
  }
}
