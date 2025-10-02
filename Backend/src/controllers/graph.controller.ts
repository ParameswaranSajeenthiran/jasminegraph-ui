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

const { TelnetSocket } = require('telnet-stream');
const net = require('net');
import { Request, Response } from 'express';
import fs from 'fs';
import { 
  GRAPH_REMOVE_COMMAND, 
  GRAPH_UPLOAD_COMMAND, 
  GRAPH_DATA_COMMAND,
  LIST_COMMAND, 
  TRIANGLE_COUNT_COMMAND, 
  PROPERTIES_COMMAND,
  UPLOAD_FROM_HDFS} from './../constants/frontend.server.constants';
import { ErrorCode, ErrorMsg } from '../constants/error.constants';
import { Cluster } from '../models/cluster.model';
import { HTTP, TIMEOUT } from '../constants/constants';
import { parseGraphFile } from '../utils/graph';

export let socket;
export let tSocket;

export type IConnection = {
  host: string;
  port: number;
}

const DEV_MODE = process.env.DEV_MODE === 'true';

export const getClusterDetails = async (req: Request) => {
  // console.log("hello");
  const clusterID = req.header('Cluster-ID');
  const cluster = await Cluster.findOne({ _id: clusterID });
  if (!cluster) {
    return { code: ErrorCode.ClusterNotFound, message: ErrorMsg.ClusterNotFound, errorDetails: '' };
  }else{
    console.log("Cluster Connection Details: ", cluster);
    return {
      port: cluster.port,
      host: cluster.host
    }
  }
}

export const telnetConnection = (connection: IConnection) => (callback: any) => {
  // If the global connection is undefined or closed, create a new connection
  if (!socket || socket.destroyed) {
    socket = net.createConnection(connection.port, connection.host, () => {
      tSocket = new TelnetSocket(socket);

      tSocket.on('do', (option) => {
        tSocket.writeWont(option);
      });

      tSocket.on('will', (option) => {
        tSocket.writeDont(option);
      });

      console.log('Telnet connection established');
      callback(tSocket);
    });

    socket.on('error', (err) => {
      console.error('Connection error: ' + err.message);
    });

    socket.on('end', () => {
      console.log('Telnet connection closed');
      socket = undefined; // Reset socket when closed
      tSocket = undefined;
    });
  } else {
    callback(tSocket); // Use existing connection
  }
};

const getGraphList = async (req: Request, res: Response) => {
  const connection = await getClusterDetails(req);
  if (!(connection.host || connection.port)) {
    return res.status(404).send(connection);
  }
  try {
    telnetConnection({host: connection.host, port: connection.port})(() => {
      let commandOutput = '';

      tSocket.on('data', (buffer) => {
        commandOutput += buffer.toString('utf8');
      });

      // Write the command to the Telnet server
      tSocket.write(LIST_COMMAND + '\n', 'utf8', () => {
        setTimeout(() => {
          if (commandOutput) {
            console.log(new Date().toLocaleString() + ' - ' + LIST_COMMAND + ' - ' + commandOutput);
            res.status(HTTP[200]).send(JSON.parse(commandOutput));
          } else {
            res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: "" });
          }
        }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
      });
    });
  } catch (err) {
    return res.status(HTTP[200]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
  }
};

const getClusterProperties = async (req: Request, res: Response) => {
  const connection = await getClusterDetails(req);
  if (!(connection.host || connection.port)) {
    return res.status(404).send(connection);
  }
  try {
    telnetConnection({host: connection.host, port: connection.port})(() => {
      let commandOutput = '';

      tSocket.on('data', (buffer) => {
        commandOutput += buffer.toString('utf8');
      });

      // Write the command to the Telnet server
      tSocket.write(PROPERTIES_COMMAND + '\n', 'utf8', () => {
        setTimeout(() => {
          if (commandOutput) {
            res.status(HTTP[200]).send(JSON.parse(commandOutput));
          } else {
            res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: "" });
          }
        }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
      });
    });
  } catch (err) {
    return res.status(HTTP[200]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
  }
};

const uploadGraph = async (req: Request, res: Response) => {
  // console.log("called upload");
  const connection = await getClusterDetails(req);
  if (!(connection.host || connection.port)) {
    return res.status(404).send(connection);
  }
  const { graphName } = req.body;
  const fileName = req.file?.filename;
  // const filePath = DEV_MODE ? "http://172.17.0.1:8080/public/" + fileName : fileName; // Get the file path
  const filePath = DEV_MODE ? "/var/tmp/data/" + fileName : fileName; // Get the file path

  console.log(GRAPH_UPLOAD_COMMAND + '|' + graphName + '|' + filePath + '\n');

  try {
    telnetConnection({host: connection.host, port: connection.port})(() => {
      let commandOutput = "";

      tSocket.on("data", (buffer) => {
        commandOutput += buffer.toString("utf8");
      });

      // Write the command to the Telnet server
      // tSocket.write(GRAPH_UPLOAD_COMMAND + '|' + graphName + '|' + filePath + '\n', "utf8", () => {
      //   setTimeout(() => {
      //     if (commandOutput) {
      //       console.log(new Date().toLocaleString() + " - UPLOAD " + req.body.graphName + " - " + commandOutput);
      //       res.status(HTTP[200]).send(commandOutput);
      //     } else {
      //       res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: ErrorMsg.NoResponseFromServer });
      //     }
      //   }, TIMEOUT.hundred); // Adjust timeout to wait for the server response if needed
      // });

      //write GRAPH_UPLOAD_COMMAND and if output == send then send again graphName|filePath if it is not send don't do anything
        tSocket.write(GRAPH_UPLOAD_COMMAND + '\n', "utf8", () => {
            setTimeout(() => {
            if (commandOutput.includes("send")) {
                commandOutput = "";
                tSocket.write(graphName + '|' + filePath + '\n', "utf8", () => {
                setTimeout(() => {
                    if (commandOutput) {
                    console.log(new Date().toLocaleString() + " - UPLOAD " + req.body.graphName + " - " + commandOutput);
                    res.status(HTTP[200]).send(commandOutput);
                    } else {
                    res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: "" });
                    }
                }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
                });
            } else {
                res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: "" });
            }
            }, TIMEOUT.hundred); // Adjust timeout to wait for the server response if needed
        });

    });
  } catch (err) {
    return res.status(HTTP[200]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
  }
};

const removeGraph = async (req: Request, res: Response) => {
  const connection = await getClusterDetails(req);
  if (!(connection.host || connection.port)) {
    return res.status(404).send(connection);
  }
  try {
    telnetConnection({host: connection.host, port: connection.port})(() => {
      let commandOutput = '';

      tSocket.on('data', (buffer) => {
        commandOutput += buffer.toString('utf8');
      });

      // Write the command to the Telnet server
      tSocket.write(GRAPH_REMOVE_COMMAND + '|' + req.params.id + '\n', 'utf8', () => {
        setTimeout(() => {
          if (commandOutput) {
            console.log(new Date().toLocaleString() + ' - REMOVE ' + req.params.id + ' - ' + commandOutput);
            return res.status(HTTP[200]).send(commandOutput);
          } else {
            return res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: "" });
          }
        }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
      });
    });
  } catch (err) {
    return res.status(HTTP[200]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
  }
};

const getDataFromHadoop = async (req: Request, res: Response) => {
  const { ip, port } = req.query;
  if (!ip || !port) {
    return res.status(400).json({ error: 'Missing ip or port parameter' });
  }
  try {
    const hadoopUrl = `http://${ip}:${port}/webhdfs/v1/home?op=LISTSTATUS`;
    const response = await fetch(hadoopUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Hadoop' });
    }
    const data = await response.json();
    // filer out data to pathSuffix only
    const fileToWrite = '/home/kopimenan/FYP_Fork/jasminegraph/env/config/hdfs_config.txt'; // specify your file path here
    fs.writeFileSync(fileToWrite, `hdfs.host=${ip}\nhdfs.port=9000\n`, { encoding: 'utf8' });
    data.FileStatuses.FileStatus = data.FileStatuses.FileStatus.map((file) => file.pathSuffix);
    res.status(200).json(data.FileStatuses.FileStatus);
    console.log(data);
  } catch (err) {
    res.status(500).json({ error: 'Error connecting to Hadoop', details: err });
  }
};

// const upload_from_hdfs = async (req: Request, res: Response) => {
//   // console.log("called upload");
//   const connection = await getClusterDetails(req);
//   if (!(connection.host || connection.port)) {
//     return res.status(404).send(connection);
//   }
//   const {graphName, isEdgeList, isDirected} = req.body;
//   const configFilePath = "/var/tmp/config/hdfs_config.txt"; // Get the file path
//
//   console.log(UPLOAD_FROM_HDFS + '|' + graphName + '\n');
//
//   try {
//     telnetConnection({host: connection.host, port: connection.port})(() => {
//       let commandOutput = "";
//
//       tSocket.on("data", (buffer) => {
//         commandOutput += buffer.toString("utf8");
//       });
//
//       tSocket.write(UPLOAD_FROM_HDFS + '\n', "utf8", () => {
//         setTimeout(() => {
//           if (commandOutput.includes("default")) {
//             commandOutput = "";
//             tSocket.write('n\n', "utf8", () => {
//               setTimeout(() => {
//                 if (commandOutput.includes("configuration")) {
//                   commandOutput = "";
//                   tSocket.write(configFilePath + '\n', "utf8", () => {
//                     setTimeout(() => {
//                       if (commandOutput.includes("path:")) {
//                         commandOutput = "";
//                         tSocket.write('/home/' + graphName + '\n', "utf8", () => {
//                           setTimeout(() => {
//                             if(commandOutput.includes('edge')){
//                               commandOutput = "";
//                               tSocket.write(isEdgeList+'\n', "utf8", () => {
//                              setTimeout(() => {
//                                if(commandOutput.includes('directed')){
//                                  commandOutput = "";
//                                  tSocket.write(isDirected+'\n',"utf8",()=>{});
//                                }
//                              }, TIMEOUT.default);
//                             }
//                           }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
//                         });
//                       } else {
//                         res.status(HTTP[400]).send({
//                           code: ErrorCode.NoResponseFromServer,
//                           message: ErrorMsg.NoResponseFromServer,
//                           errorDetails: ""
//                         });
//                       }
//                     }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
//                   });
//                 } else {
//                   res.status(HTTP[400]).send({});
//                 }
//               }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
//             });
//           } else {
//             res.status(HTTP[400]).send({
//               code: ErrorCode.NoResponseFromServer,
//               message: ErrorMsg.NoResponseFromServer,
//               errorDetails: ""
//             });
//           }
//         }, TIMEOUT.hundred); // Adjust timeout to wait for the server response if needed
//       });
//     });
//   } catch (err) {
//     return res.status(HTTP[200]).send({code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err});
//   }
// };



const triangleCount = async (req: Request, res: Response) => {
  const connection = await getClusterDetails(req);
  if (!(connection.host || connection.port)) {
    return res.status(HTTP[404]).send(connection);
  }
  const { priority, graph_id } = req.body;
  try {
    telnetConnection({host: connection.host, port: connection.port})(() => {
      let commandOutput = '';

      tSocket.on('data', (buffer) => {
        commandOutput += buffer.toString('utf8');
      });

      console.log(TRIANGLE_COUNT_COMMAND + '|' + graph_id + '|' + priority + '\n');

      // Write the command to the Telnet server
      tSocket.write(TRIANGLE_COUNT_COMMAND + '|' + graph_id + '|' + priority + '\n', 'utf8', () => {
        setTimeout(() => {
          if (commandOutput) {
            console.log(new Date().toLocaleString() + ' - TRIANGLECOUNT - ' + commandOutput);
            res.status(HTTP[200]).send(commandOutput);
          } else {
            res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: "" });
          }
        }, TIMEOUT.default); // Adjust timeout to wait for the server response if needed
      });
    });
  } catch (err) {
    return res.status(HTTP[200]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
  }
};

const getGraphVisualization = async (req, res) => {
  const id = req.query.id as string;
  const filePath = `./src/script/sample/graph_dataset${id}.json`;

  try{
    const graph = parseGraphFile(filePath);
    return res.status(HTTP[200]).send({data: graph})
  } catch (err){
    return res.status(HTTP[200]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
  }
}

const getGraphData = async (req, res) => {
  const connection = await getClusterDetails(req);
  if (!(connection.host || connection.port)) {
    return res.status(404).send(connection);
  }
  try {
    telnetConnection({host: connection.host, port: connection.port})(() => {
      let commandOutput = '';

      tSocket.on('data', (buffer) => {
        commandOutput += buffer.toString('utf8');
      });

      // Write the command to the Telnet server
      tSocket.write(GRAPH_DATA_COMMAND + '\n', 'utf8', () => {
        setTimeout(() => {
          if (commandOutput) {
            console.log(new Date().toLocaleString() + ' - ' + GRAPH_DATA_COMMAND + ' - ' + commandOutput);
            res.status(HTTP[200]).send({data: JSON.parse(commandOutput)});
          } else {
            res.status(HTTP[400]).send({ code: ErrorCode.NoResponseFromServer, message: ErrorMsg.NoResponseFromServer, errorDetails: "" });
          }
        }, TIMEOUT.hundred); // Adjust timeout to wait for the server response if needed
      });
    });
  } catch (err) {
    return res.status(HTTP[200]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
  }
}



export { getGraphList, uploadGraph, removeGraph, triangleCount, getGraphVisualization, getGraphData, getClusterProperties, getDataFromHadoop };
