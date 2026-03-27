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

'use client';
import React, { useState } from 'react';
import {
  Button,
  Form,
  Input,
  message,
} from 'antd';
import { getUserDataByToken, registerAdmin, userLogin } from '@/services/auth-service';
import useAccessToken from '@/hooks/useAccessToken';
import { useDispatch } from 'react-redux';
import { IUserAccessData } from '@/types/user-types';
import { set_User_Data } from '@/redux/features/authData';

const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 16,
      offset: 8,
    },
  },
};

type props = {
  onSuccess: () => void;
}

const AdminProfile = ({onSuccess}:props) => {
  const dispatch = useDispatch();
  const { setSrvAccessToken, setSrvRefreshToken} = useAccessToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try{
      const res = await registerAdmin(values.firstName, values.lastName, values.email, values.password);
      message.loading("Creating profile", 2);
      const tokenRes = await userLogin(values.email, values.password);
      if(tokenRes.accessToken && tokenRes.refreshToken){
        setSrvAccessToken(tokenRes.accessToken);
        setSrvRefreshToken(tokenRes.refreshToken);
      }
      await saveUserData(tokenRes.accessToken);
      onSuccess();
    }catch(err){
      message.error("Failed to create profile");
      console.log(err);
    }
    setLoading(false);
  };

  const saveUserData = async (token: string) => {
    try{
      const res = await getUserDataByToken(token).then((res) => res.data);
      const userData: IUserAccessData = {
        email: res.data.email,
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        role: res.data.role,
        enabled: res.data.enabled,
        id: res.data.id,
      }
      dispatch(set_User_Data(userData));
    }catch(err){
      console.log("Failed to save user data");
    }
  }
  
  return (
    <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column"}}>
      <Form
      // {...formItemLayout}
      form={form}
      name="register"
      onFinish={onFinish}
      initialValues={{ residence: ['zhejiang', 'hangzhou', 'xihu'], prefix: '86' }}
      style={{ maxWidth: 600 }}
        scrollToFirstError
        size='large'
      >
        <Form.Item
          name="firstName"
          label="First Name"
          rules={[
            {
              required: true,
              message: 'Please input your first name!',
            },
          ]}
          >
          <Input />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Last Name"
          rules={[
            {
              required: true,
              message: 'Please input your last name!',
            },
          ]}
          >
          <Input />
        </Form.Item>

        <Form.Item
          name="email"
          label="E-mail"
          rules={[
            {
              type: 'email',
              message: 'The input is not valid E-mail!',
            },
            {
              required: true,
              message: 'Please input your E-mail!',
            },
          ]}
          >
          <Input />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            {
              required: true,
              message: 'Please input your password!',
            },
          ]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="confirm"
          label="Confirm Password"
          dependencies={['password']}
          hasFeedback
          rules={[
            {
              required: true,
              message: 'Please confirm your password!',
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('The new password that you entered do not match!'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create Profile
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default AdminProfile;
