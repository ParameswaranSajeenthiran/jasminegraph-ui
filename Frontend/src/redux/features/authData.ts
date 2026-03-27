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

import { IUserAccessData } from "@/types/user-types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IAuthenticationData {
  isUserAuthenticated: boolean;
  isUserDataFetched: boolean;
  userData: IUserAccessData;
}

const initialData: IAuthenticationData = {
  isUserAuthenticated: false,
  isUserDataFetched: false,
  userData: {
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    enabled: false,
  },
};

export const authDataSlice = createSlice({
  name: "authData",
  initialState: initialData,
  reducers: {
    set_Is_User_Authenticated: (state, action: PayloadAction<boolean>) => {
      state.isUserAuthenticated = action.payload;
    },
    set_User_Data: (state, action: PayloadAction<IUserAccessData>) => {
      state.userData = action.payload;
      state.isUserDataFetched = true;
    },
    set_Clear_User_Data: (state) => {
      state.userData = initialData.userData;
      state.isUserDataFetched = false;
    }
  },
});

export const {
  set_Is_User_Authenticated,
  set_User_Data,
  set_Clear_User_Data
} = authDataSlice.actions;

export default authDataSlice.reducer;
