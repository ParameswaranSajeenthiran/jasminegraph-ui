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
import React, { useEffect, useState } from "react";
import { IClusterDetails } from "@/types/cluster-types";
import { Table, Tag, Button, AutoComplete, Input, Space } from 'antd';
import type { TableProps, PaginationProps, AutoCompleteProps } from 'antd';
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/redux/hook";
import { IUserAccessData } from "@/types/user-types";
import { addUserToCluster, getCluster, removeUserFromCluster } from "@/services/cluster-service";
import { set_Selected_Cluster } from "@/redux/features/clusterData";
import { getAllUsers } from "@/services/user-service";
import { set_Users_Cache } from "@/redux/features/cacheSlice";

interface DataType {
  key: string;
  userID: string;
  Name: string;
  Email: string;
  Role: string;
  Status: boolean;
}

const PaginationProps = {
  pageSize: 5,
  defaultPageSize: 5,
  showSizeChanger: true,
  showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`,
} as PaginationProps;

export default function AccessManagement({ params }: { params: { id: string } }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<boolean>(true);
  const { userData: user } = useAppSelector(state => state.authData)
  const { selectedCluster } = useAppSelector(state => state.clusterData)
  const { users } = useAppSelector(state => state.cacheData)
  const [clusterDetails, setClusterDetails] = useState<IClusterDetails | null>(selectedCluster);
  const [userData, setUserData] = useState<IUserAccessData[]>(users);
  const [clusterUsers, setClusterUsers] = useState<IUserAccessData[]>([]);

  const columns: TableProps<DataType>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'Name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'Role',
      key: 'role',
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'status',
      render: (_, { Status }) => (
        <>
          {Status ? (
            <Tag color={'green'}>
              {"Active"}
            </Tag>) : (
            <Tag color={"volcano"}>
              {"Inactive"}
            </Tag>
          )}
        </>
      ),
    }
  ];

  const adminsAccessColumns: TableProps<DataType>['columns'] = [...columns,
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" danger size="small" onClick={() => handleUserRemove(record.userID)}>Remove</Button> 
        </Space>
      ),
    }
  ];

  const getTableData = () => {
    return clusterUsers.map((data) => {
      return {
        key: data.id,
        userID: data.id,
        Name: data.firstName + " " + data.lastName,
        Email: data.email,
        Role: data.role,
        Status: data.enabled,
      };
    });
  }

  const handleUserAdd = async (userID: string) => {
    const user = userData.find((user) => user.id == userID)
    setClusterUsers([...clusterUsers, user!])
    try{
      const res = await addUserToCluster(userID, String(clusterDetails!.id));
      if(res.data){
        console.log("User added successfully")
      }
    }catch(err){
      console.log("failed to add user id: ", userID)
    }
  }

  const handleUserRemove = async (userID: string) => {
    setClusterUsers(clusterUsers.filter((user) => user.id !== userID))
    try{
      const res = await removeUserFromCluster(userID, String(clusterDetails!.id));
      if(res.data){
        console.log("User removed successfully (id: ", userID, ")")
      }
    }catch(err){
      console.log("Failed to add user id: ", userID)
    }
  }

  const renderItem = (title: string, userID: string) => ({
    value: title,
    label: (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {title}
        <span>
           <Button size="small" type="primary" onClick={()=> handleUserAdd(userID)}>Add</Button>
        </span>
      </div>
    ),
  });

  const [options, setOptions] = React.useState<AutoCompleteProps['options']>([]);

  const handleSearch = (value: string) => {
    setOptions(() => {
      const filteredUsers = userData.filter((user) =>
                        user.firstName.toLowerCase().includes(value.toLowerCase()) ||
                        user.lastName.toLowerCase().includes(value.toLowerCase()) ||
                        user.email.toLowerCase().includes(value.toLowerCase()));
      return filteredUsers.map((user) => (renderItem(user.email, user.id)));
    });
  };

  const fetchClusterDetails = async () => {
    try{
      const res = await getCluster(params.id);
      if(res.data){
        setClusterDetails(res.data)
      }
      dispatch(set_Selected_Cluster(res.data))
    }catch(err){
      console.log("Failed to fetch cluster (clusterID: ", params.id, ")")
    }
  }

  const fetchUserData = async () => {
    try{
      const res = await getAllUsers();
      if(res.data){
        setUserData(res.data)
        dispatch(set_Users_Cache(res.data))
      }
    }catch(err){
      console.log("Failed to fetch cluster (clusterID: ", params.id, ")")
    }
  }
  
  useEffect(()=> {
    if (clusterDetails == null || selectedCluster == null){
      fetchClusterDetails()
    }
    fetchUserData();
  }, [params])

  useEffect(()=>{
    if(clusterDetails){
      const clusterOwner = userData.find((user) => user.id === clusterDetails.cluster_owner);
      let users: IUserAccessData[] = [];
      if(clusterOwner){
        users.push(clusterOwner);
      }
      userData.forEach((user) => {
        if(clusterDetails.user_ids.includes(user.id)){
          users.push(user);
        }
      })
      setClusterUsers(users)
    }
  },[clusterDetails, userData])


  return (
    <div className="">
      <div style={{ display: "flex", justifyContent: "space-between", margin: "20px 0px" }}>
        <div style={{marginBottom: "20px"}}>
          <h1 style={{fontSize: "xx-large", fontWeight: "600", lineHeight: "1.5"}}>User Management</h1>
          <p>This page provides role-based access control to this cluster.</p>
        </div>
        {user.role === "admin" && (
          <AutoComplete
            style={{ width: 400 }}
            onSearch={handleSearch}
            placeholder="search..."
            options={options}
          >
            <Input.Search size="large"/>
          </AutoComplete>
        )}
      </div>
      <Table columns={user.role == "admin" ? adminsAccessColumns : columns} dataSource={getTableData()} pagination={PaginationProps}/>
    </div>
  );
}
