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
import {
  createClusterRepo,
  getAllClustersRepo,
  getClusterByIdRepo,
  addUserToClusterRepo,
  removeUserFromClusterRepo,
  getMyClustersRepo
} from '../repository/cluster.repository';
import { ErrorCode } from '../constants/error.constants';
import { HTTP } from '../constants/constants';
import net from 'net';

const addNewCluster = async (req: Request, res: Response) => {
  const { name, description, host, port } = req.body;
  const userId = (req as any).auth?.sub;
  if (!userId) {
    console.error("[addNewCluster] No userId in token");
    return res.status(HTTP[401]).json({ message: 'Unauthorized: User ID not found in token' });
  }
  try {
  const cluster = await createClusterRepo({
      name,
      description,
      host,
      port,
      user_ids: [],
      cluster_owner: userId
    });
    return res.status(HTTP[201]).json({ data: cluster });
  } catch (err) {
    if (err instanceof Error && (err as any).code === ErrorCode.UniqueViolation) {
      console.warn("[addNewCluster] Duplicate host and port combination:", { host, port });
      return res.status(HTTP[400]).json({
        errorCode: 'DUPLICATE_HOST_PORT',
        message: 'A cluster with the same host and port already exists. Please use a different combination.'
      });
    }
    console.error("[addNewCluster] Error:", err);
    return res.status(HTTP[500]).json({
      message: 'Internal Server Error: Unable to create the cluster.',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    });
  }
};

const getAllClusters = async (req: Request, res: Response) => {
  try {
  const clusters = await getAllClustersRepo();
    return res.status(HTTP[200]).json({ data: clusters });
  } catch (err) {
    console.error("[getAllClustersHandler] Error:", err);
    return res.status(HTTP[500]).json({
      message: 'Internal Server Error: Unable to fetch clusters.',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    });
  }
};

const getCluster = async (req: Request, res: Response) => {
  const { id } = req.params;
  const clusterId = Number(id);
  if (isNaN(clusterId)) {
    console.error("[getCluster] Invalid cluster ID:", id);
    return res.status(400).json({ message: 'Invalid cluster ID' });
  }
  try {
  const cluster = await getClusterByIdRepo(clusterId);
    if (!cluster) {
      console.warn(`[getCluster] Cluster with id "${id}" not found.`);
      return res.status(HTTP[404]).json({ message: `Cluster with id "${id}" not found.` });
    }
    return res.status(HTTP[200]).json({ data: cluster });
  } catch (err) {
    console.error("[getCluster] Error:", err);
    return res.status(HTTP[500]).json({
      message: 'Internal Server Error: Unable to get the cluster.',
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    });
  }
};

const addUserToCluster = async (req: Request, res: Response) => {
  const { userID, clusterID } = req.body;
  try {
  const cluster = await addUserToClusterRepo(Number(clusterID), userID);
    if (!cluster) {
      console.warn(`[addUserToClusterHandler] Cluster with id "${clusterID}" not found.`);
      return res.status(HTTP[404]).json({ message: `Cluster with id "${clusterID}" not found.` });
    }
    return res.status(HTTP[200]).json({ data: cluster });
  } catch (err) {
    console.error("[addUserToClusterHandler] Error:", err);
    return res.status(HTTP[500]).json({
      message: 'Internal Server Error: Unable to add the user to the cluster.',
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
};

const removeUserFromCluster = async (req: Request, res: Response) => {
  const { userID, clusterID } = req.body;
  try {
  const cluster = await removeUserFromClusterRepo(Number(clusterID), userID);
    if (!cluster) {
      console.warn(`[removeUserFromClusterHandler] Cluster with id "${clusterID}" not found.`);
      return res.status(HTTP[404]).json({ message: `Cluster with id "${clusterID}" not found.` });
    }
    return res.status(HTTP[200]).json({ data: cluster });
  } catch (err) {
    console.error("[removeUserFromClusterHandler] Error:", err);
    return res.status(HTTP[500]).json({
      message: 'Internal Server Error: Unable to remove the user from the cluster.',
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
};

const getMyClusters = async (req: Request, res: Response) => {
  const userID = (req as any).auth?.sub;
  if (!userID) {
    console.error("[getMyClustersHandler] No userID in token");
    return res.status(HTTP[401]).json({ message: 'Unauthorized: User ID not found in token' });
  }
  try {
  const clusters = await getMyClustersRepo(userID);
    return res.status(HTTP[200]).json({ data: clusters });
  } catch (err) {
    console.error("[getMyClustersHandler] Error:", err);
    return res.status(HTTP[500]).json({
      message: 'Internal Server Error: Unable to fetch clusters for the user. Please try again later.',
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
};

const getSelectedClustersStatus = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body; 
    if (!ids || !Array.isArray(ids)) {
      return res.status(HTTP[400]).json({ message: "Invalid cluster IDs" });
    }
    
    const clusters = await getAllClustersRepo();
    const filteredClusters = clusters.filter(c => ids.includes(c.id));

    const timeoutMs = 2000;

    const statusPromises = filteredClusters.map((cluster: any) => {
      return new Promise<{ id: number; connected: boolean }>((resolve) => {
        const socket = new net.Socket();
        let responded = false;

        const done = (connected: boolean) => {
          if (responded) return;
          responded = true;
          try { socket.destroy(); } catch {}
          resolve({ id: cluster.id, connected });
        };

        socket.setTimeout(timeoutMs, () => done(false));
        socket.on('error', () => done(false));
        socket.connect(cluster.port, cluster.host, () => done(true));
      });
    });

    const statuses = await Promise.all(statusPromises);
    return res.status(HTTP[200]).json({ clusters: statuses });
  } catch (err) {
    console.error('[getSelectedClustersStatus] Error:', err);
    return res.status(HTTP[500]).json({ message: 'Unable to fetch cluster statuses', error: (err as Error).message });
  }
};

export { addNewCluster, getAllClusters, getCluster, addUserToCluster, removeUserFromCluster, getMyClusters, getSelectedClustersStatus };
