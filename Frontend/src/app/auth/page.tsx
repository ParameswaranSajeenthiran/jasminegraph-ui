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

'use client';
import React, { useEffect, useState } from 'react';
import LoginForm from '@/components/auth/login-form';
import Loading from '@/components/auth/Loading';
import { checkBackendHealth } from '@/services/auth-service';
import { getAllUsers } from '@/services/user-service';
import { Alert, Button, message } from 'antd';
import { useRouter } from 'next/navigation';

const Auth = () => {
  const router = useRouter();
  const [showSetupBackendAlert, setShowSetupBackendAlert] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const pollHealth = async () => {
      const healthy = await checkBackendHealth();
      if (healthy) {
        setHealthy(true);
        setLoading(false);
        clearInterval(interval);
      } else {
        setHealthy(false);
        setLoading(true);
      }
    };
    interval = setInterval(pollHealth, 4000);
    pollHealth(); 
    return () => clearInterval(interval);
  }, []);

  const getUsers = async () => {
    try{
      const users = await getAllUsers();
      if (users && users.data.length == 0){
        setShowSetupBackendAlert(true);
      }
    }catch(err){
      message.error("Failed to ping backend");
    }
  };

  useEffect(() => {
    if (healthy) {
      getUsers();
    }
  }, [healthy]);

  if (loading || !healthy) {
    return <Loading />;
  }

  return (
      <div style={{height: "100vh", display: "flex", alignItems: "center"}}>
        <div style={{display: "flex", width: "60%", justifyContent: "center", alignItems: "center", flexDirection: "column"}}>
          <p style={{fontSize: "80px", fontWeight: "500"}}>JasmineGraph</p>
          {showSetupBackendAlert && (
          <Alert  
            message="Admin User Not Found" 
            type="warning" 
            showIcon 
            closable 
            onClose={() => setShowSetupBackendAlert(false)} 
            style={{width: showSetupBackendAlert ? "60%" : "0%"}}
            action={
              <Button size="small" type="primary" onClick={() => {
                router.push("/setup");
              }}>
                Go to Setup
              </Button>
            }
            />
          )}
        </div>
        <div style={{display: "flex", width: "40%", justifyContent: "flex-start"}}>
          <LoginForm />
        </div>
      </div>
  )
}

export default Auth;
