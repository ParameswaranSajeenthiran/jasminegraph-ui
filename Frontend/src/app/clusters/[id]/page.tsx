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
import { Descriptions, Input, Row, Col, Divider } from 'antd';
import type { DescriptionsProps } from 'antd';
import { Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { IClusterDetails, IClusterProperties } from "@/types/cluster-types";
import { useAppSelector } from "@/redux/hook";
import { useDispatch } from "react-redux";
import { set_Selected_Cluster } from "@/redux/features/clusterData";
import { getCluster, getClusterProperties } from "@/services/cluster-service";

interface DataType {
  key: string;
  nodeID: string;
  ipAddress: string;
  status: boolean;
  role: string;
  upTime: number;
}

const columns: TableProps<DataType>['columns'] = [
  {
    title: 'Node ID',
    dataIndex: 'nodeID',
    key: 'nodeID',
  },
  {
    title: 'IP Address',
    dataIndex: 'ipAddress',
    key: 'ip',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (_, { status: Status }) => (
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
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
  },
  {
    title: 'Uptime',
    dataIndex: 'upTime',
    key: 'uptime',
    render: (text) => <p>{text} days</p>
  }
];

export default function ClusterDetails({ params }: { params: { id: string } }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<boolean>(true);
  const { selectedCluster } = useAppSelector(state => state.clusterData)
  const [clusterDetails, setClusterDetails] = useState<IClusterDetails | null>(selectedCluster);
  const [clusterProperties, setClusterProperties] = useState<IClusterProperties | null>(null);

  const items: DescriptionsProps['items'] = [
    {
      key: '1',
      label: 'Cluster ID',
      children: clusterDetails?.id || "-",
    },
    {
      key: '2',
      label: 'Host',
      children: clusterDetails?.host || "-",
    },
    {
      key: '3',
      label: 'JasmineGraph Version',
      children: clusterProperties?.version || "-",
    },
    {
      key: '4',
      label: 'Platform',
      children: 'docker',
    },
    {
      key: '5',
      label: 'Number of Workers',
      children: clusterProperties?.workersCount || "-",
    },{
      key: '6',
      label: 'Number of Partitions',
      children: clusterProperties?.partitionCount || "-",
    },
  ];

  const fetchClusterDetails = async () => {
    try{
      const res = await getCluster(params.id);
      if(res.data){
        setClusterDetails(res.data)
      }
      dispatch(set_Selected_Cluster(res.data))
    }catch(err){
      console.log("Failed to fetch cluster: ", err)
    }
  }

   const fetchClusterProperties = async () => {
    try{
      const res = await getClusterProperties(params.id);
      if(res.data){
        setClusterProperties(res.data)
      }
    }catch(err){
      console.log("Failed to fetch cluster properties: ", err)
    }
  }

  useEffect(()=> {
    fetchClusterDetails()
    fetchClusterProperties()
  }, [])

  const getNodeData = () => {
    return undefined;
  }

  const filterMasterNodeData = (nodes: DataType[] | undefined) => {
    return nodes?.filter((node) => node.role === "Master");
  }

  const filterWorkerNodeData = (nodes: DataType[] | undefined) => {
    return nodes?.filter((node) => node.role === "Worker");
  }

  return (
    <div className="">
      <Row style={{justifyContent: "space-between", marginTop: "20px"}}>
        <Col span={10}>
        <h1 style={{fontSize: "xx-large", fontWeight: "600", lineHeight: "1.5", marginBottom: "20px"}}>{clusterDetails?.name}</h1>
        <p><strong>Description: </strong>{clusterDetails?.description}</p>
        </Col>
        <Col span={12}>
          <Descriptions title="Cluster Information" items={items} column={1} />
        </Col>
      </Row>
      <Divider>Master Nodes</Divider>
      <Table columns={columns} dataSource={filterMasterNodeData(getNodeData())} pagination={false} />
      <Divider>Worker Nodes</Divider>
      <Table columns={columns} dataSource={filterWorkerNodeData(getNodeData())} pagination={false} />
    </div>
  );
}
