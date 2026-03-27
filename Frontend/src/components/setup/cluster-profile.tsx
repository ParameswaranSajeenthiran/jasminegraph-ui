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
import { addNewCluster } from '@/services/cluster-service';
import useAccessToken from '@/hooks/useAccessToken';

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

const ClusterSetup = ({onSuccess}:props) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const { getSrvAccessToken } = useAccessToken();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const token = getSrvAccessToken() || "";
      const response = await addNewCluster(values.name, values.description, values.host, values.port, token);
      if ('errorCode' in response) {
        message.error(response.message);
      } else {
        onSuccess();
        form.resetFields();
      }
    } catch (err) {
      console.error("An unexpected error occurred:", err);
      message.error("An unexpected error occurred while adding the cluster.");
    }
    setLoading(false);
  };

  return (
    <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column"}}>
      <Form
      // {...formItemLayout}
      form={form}
      name="register"
      onFinish={onFinish}
      initialValues={{}}
      style={{ maxWidth: 600 }}
      scrollToFirstError
      size='large'
      >
        <Form.Item
          name="name"
          label="Cluster Name"
          rules={[
            {
              required: true,
              message: 'Please input valid cluster name',
            },
          ]}
          >
          <Input />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          >
          <Input.TextArea />
        </Form.Item>
        <Form.Item
          name="host"
          label="Host"
          rules={[
            {
              required: true,
              message: 'Please input host address',
            },
          ]}
          >
          <Input />
        </Form.Item>

        <Form.Item
          name="port"
          label="Port"
          rules={[
            {
              required: true,
              message: 'Please input port!',
            },
          ]}
          hasFeedback
        >
          <Input />
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit" loading={loading}>
            add default cluster
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default ClusterSetup;
