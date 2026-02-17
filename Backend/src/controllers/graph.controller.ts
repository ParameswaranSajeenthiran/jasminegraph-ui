
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
import {
    GRAPH_REMOVE_COMMAND,
    GRAPH_UPLOAD_COMMAND,
    GRAPH_DATA_COMMAND,
    LIST_COMMAND,
    TRIANGLE_COUNT_COMMAND,
    PROPERTIES_COMMAND,
    STOP_CONSTRUCT_KG_COMMAND,
    CONSTRUCT_KG_COMMAND, CONSTRUCT_KG_COMMAND_LOCAL, GRAPHRAG_QUERY_COMMAND
} from '../constants/frontend.server.constants';
import { ErrorCode, ErrorMsg } from '../constants/error.constants';
import { getClusterByIdRepo } from '../repository/cluster.repository';
import { HTTP, TIMEOUT } from '../constants/constants';
import { parseGraphFile } from '../utils/graph';
import {
    createKGConstructionMetaRepo,
    getKGConstructionMetaByClusterRepo,
    updateKGConstructionMetaStatusRepo,
    deleteKGConstructionMetaRepo,
    KGStatus

} from "../repository/kg-construction-meta.repository";
import fs from "fs";
import path from "path";

import pdfParse from "pdf-parse";


export let socket;
export let tSocket;

export type IConnection = {
    host: string;
    port: number;
}

const DEV_MODE = process.env.DEV_MODE === 'true';
const  HOST = process.env.HOST ;
const  PORT = process.env.PORT ;
const CACHE_DIR = path.resolve("/app/caches");

export const getClusterDetails = async (req: Request) => {
  const clusterID = req.header('Cluster-ID');
  const cluster = await getClusterByIdRepo(Number(clusterID));
  if (!cluster) {
    return { code: ErrorCode.ClusterNotFound, message: ErrorMsg.ClusterNotFound, errorDetails: '' };
  }else{
    console.log("Cluster Connection Details: ", cluster);
    return {
      port: cluster.port,
      host: cluster.host
    };
  }
};

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
    const connection = await getClusterDetails(req);
    if (!(connection.host || connection.port)) {
        return res.status(404).send(connection);
    }
    const { graphName } = req.body;
    const fileName = req.file?.filename;
    const filePath = HOST +":"+PORT + "/public/" + fileName ;

    console.log(GRAPH_UPLOAD_COMMAND + '|' + graphName + '|' + filePath + '\n');

    try {
        telnetConnection({host: connection.host, port: connection.port})(() => {
            let commandOutput = "";

            tSocket.on("data", (buffer) => {
                commandOutput += buffer.toString("utf8");
            });


            tSocket.write(GRAPH_UPLOAD_COMMAND + '|' + graphName + '|' + filePath + '\n', 'utf8', () => {
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

export const constructKG = async (req: Request, res: Response) => {
    const connection = await getClusterDetails(req);
    if (!(connection.host || connection.port)) {
        return res.status(404).send(connection);
    }
    const clusterId = req.header('Cluster-ID');
    const {
        hdfsIp,
        hdfsPort,
        hdfsFilePath,
        llmRunnerString,         // [{ runner: string, chunks: number }]
        inferenceEngine,
        model,
        chunkSize,
        status,
        graphId
    } = req.body;
    console.log("req.body", req.body)

    try {
        telnetConnection({ host: connection.host, port: connection.port })(() => {
            let commandOutput = "";

            tSocket.on("data", async (buffer) => {
                const msg = buffer.toString("utf8").trim();
                console.log("Master:", msg);
                commandOutput += msg + "\n";

                if (msg.includes("Do you want to use the default HDFS server")) {

                    console.log("sending n")
                    tSocket.write("n\n");

                } else if (msg.includes("HDFS Server IP:")) {
                    console.log("IP:", hdfsIp);
                    tSocket.write(hdfsIp.toString("utf8").trim() + "\n");
                } else if (msg.includes("HDFS Server Port:")) {
                    console.log("port:", hdfsPort.toString().toString("utf8").trim() + "\n");
                    tSocket.write(hdfsPort.toString().toString("utf8").trim() + "\n");
                } else if (msg.includes("HDFS file path:")) {
                    tSocket.write(hdfsFilePath.toString("utf8").trim() + "\n");
                } else if (msg.includes("There exists a graph with the file path")) {
                    if (status === "paused") {
                        tSocket.write("y\n"); // or "n" depending on user choice

                    } else {
                        tSocket.write("n\n"); // or "n" depending on user choice

                    }
                } else if (msg.includes("Graph Id to resume?")) {

                    tSocket.write(graphId.toString("utf8").trim() + "\n");
                } else if (msg.includes("LLM runner hostname:port:")) {
                    console.log(llmRunnerString);
                    if (llmRunnerString == null) {
                        console.log("ending telnet connection")
                        // tSocket.end();
                        tSocket.write("exit\n");
                        res.status(HTTP[200]).send({message: "HDFS is reachable from the cluster"});

                    } else {
                        tSocket.write(llmRunnerString.toString("utf8").trim() + "\n");

                    }
                } else if (msg.includes("LLM inference engine?")) {
                    tSocket.write(inferenceEngine.toString("utf8").trim() + "\n");
                } else if (msg.includes("What is the LLM you want to use?")) {
                    if (model == null) {
                        console.log("ending telnet connection")
                        tSocket.write("exit\n");
                        // tSocket.end();

                        res.status(HTTP[200]).send({message: "LLM is reachable from the cluster"});
                    } else {
                        tSocket.write(model.toString("utf8").trim() + "\n");

                    }
                } else if (msg.includes("chunk size")) {
                    tSocket.write(chunkSize.toString().toString("utf8").trim() + "\n");
                } else if (msg.includes("Graph Id")) {
                    const graphId = msg.split(":")[1].trim()
                    tSocket.write("exit\n");
                    if (status === "paused") {
                        await updateKGConstructionMetaStatusRepo(
                            Number(graphId),
                            "running"
                        );
                    } else {
                        await createKGConstructionMetaRepo({
                            user_id: "",
                            graph_id: graphId,
                            hdfs_ip: hdfsIp,
                            hdfs_port: hdfsPort,
                            hdfs_file_path: hdfsFilePath,
                            llm_runner_string: llmRunnerString,
                            inference_engine: inferenceEngine,
                            model,
                            chunk_size: chunkSize,
                            status: "running",
                            message: "Knowledge Graph construction initiated",
                            cluster_id: clusterId!
                        });
                    }

                    console.log("KG extraction started");
                    res.status(HTTP[200]).send({message: "Knowledge Graph construction Started"});
                    // tSocket.end();
                }
                else if(msg.includes("HDFS file System Not reachable.")) {
                    res.status(HTTP[400]).send({message: msg});

                } else if(msg.includes("Could not connect")) {
                res.status(HTTP[400]).send({message: msg});

            }  else if(msg.includes("The provided HDFS path is invalid.")) {
                res.status(HTTP[400]).send({message: msg});

            }
            });

            // Kick off by sending constructkg
            tSocket.write(CONSTRUCT_KG_COMMAND + "\n");
        });
    } catch (err) {
        console.error("❌ Error in constructKG:", err);
        return res.status(HTTP[500]).send({ code: ErrorCode.ServerError, message: ErrorMsg.ServerError, errorDetails: err });
    }
};

export const graphRAGQuery = async (req: Request, res: Response) => {
    const connection = await getClusterDetails(req);
    if (!(connection.host && connection.port)) {
        return res.status(404).send(connection);
    }

    const {
        graphId,
        query,
        llmRunnerString,
        inferenceEngine,
        model
    } = req.body;

    try {

        await new Promise<void>((resolve, reject) => {
            telnetConnection({ host: connection.host, port: connection.port })(() => {
                const timeout = setTimeout(() => {
                    if (!answered) {
                        console.error(" GraphRAG timed out");
                        res.status(504).send({ error: "GraphRAG timeout" });
                        tSocket.end();
                        resolve();           // unblock Express
                    }
                }, 120000); // 2 minutes
                let answered = false;

                tSocket.on("data", (buffer) => {
                    const msg = buffer.toString("utf8").trim();
                    console.log("GraphRAG:", msg);

                    /* 1. Graph ID */
                    if (msg.includes("Graph ID")) {
                        tSocket.write(graphId.toString().trim() + "\n");
                    }

                    /* 2. NL query */
                    else if (msg.includes("Input natural language query:")) {
                        tSocket.write(query.trim() + "\n");
                    }

                    /* 3. LLM runner */
                    else if (msg.includes("LLM runner hostname:port:")) {
                        tSocket.write(llmRunnerString.trim() + "\n");
                    }

                    /* 4. Inference engine */
                    else if (msg.includes("LLM inference engine? ollama/vllm?")) {
                        tSocket.write(inferenceEngine.trim() + "\n");
                    }

                    /* 5. Model */
                    else if (msg.includes("What is the LLM you want to use")) {
                        tSocket.write(model.toString().trim() + "\n");
                        // setTimeout(resolve, TIMEOUT.default)
                    }

                    /* 6. Model missing → auto fallback */
                    else if (msg.includes("not available on ollama server")) {
                        console.warn("⚠️ Model missing, falling back to llama3");
                        tSocket.write("llama3\n");
                    }

                    /* 7. Final answer */
                    else if (
                        msg.startsWith("ANSWER") ||
                        msg.startsWith("Result") ||
                        msg.includes("GraphRAG response")
                    ) {
                        answered = true;
                        tSocket.write("exit\n");

                        // Extract clean answer (optional cleanup)
                        const cleanAnswer = msg.replace(/^ANSWER[:\s-]*/i, "").trim();
                        const jsonResults = JSON.parse(cleanAnswer);

                        // Dummy objectives data
                        const dummyObjectives = [
                            {
                                id: "objA1",
                                query: "Which director of the 1995 film Silent Horizon won a Golden Globe Award?",
                                search_type: "SEMANTIC_BEAM_SEARCH",
                                llm_reasoning: {
                                    summarizedPathObj : {
                                        pathNodes: [
                                            { id: "622", label: "Person", name: "Laura Bennett", partitionID: "4" },
                                            { id: "620", label: "Book", name: "Crimson Echo", partitionID: "4" }
                                        ],
                                        pathRels: [
                                            { direction: "right", id: "9011", type: "WROTE" }
                                        ]
                                    }
                                },
                                results: [
                                    {
                                        hop: 2,
                                        pathObj: {
                                            pathNodes: [
                                                { id: "201", label: "Person", name: "Emily Carter", partitionID: "2" },
                                                { id: "305", label: "Movie", name: "Silent Horizon", partitionID: "2" }
                                            ],
                                            pathRels: [
                                                { direction: "right", id: "9001", type: "DIRECTED" }
                                            ]
                                        },
                                        score: 0.91
                                    },
                                    {
                                        hop: 3,
                                        pathObj: {
                                            pathNodes: [
                                                { id: "201", label: "Person", name: "Emily Carter", partitionID: "2" },
                                                { id: "410", label: "Award", name: "Golden Globe Award", partitionID: "3" }
                                            ],
                                            pathRels: [
                                                { direction: "right", id: "9002", type: "WON_AWARD" }
                                            ]
                                        },
                                        score: 0.87
                                    },
                                    {
                                        hop: 1,
                                        pathObj: {
                                            pathNodes: [
                                                { id: "512", label: "Person", name: "Michael Reeves", partitionID: "2" },
                                                { id: "305", label: "Movie", name: "Silent Horizon", partitionID: "2" }
                                            ],
                                            pathRels: [
                                                { direction: "right", id: "9003", type: "ACTED_IN" }
                                            ]
                                        },
                                        score: 0.74
                                    }
                                ]
                            },
                            {
                                id: "objB2",
                                query: "In which year was the novel Crimson Echo published?",
                                search_type: "SEMANTIC_BEAM_SEARCH",
                                results: [
                                    {
                                        hop: 1,
                                        pathObj: {
                                            pathNodes: [
                                                { id: "620", label: "Book", name: "Crimson Echo", partitionID: "4" },
                                                { id: "621", label: "Year", name: "2003", partitionID: "4" }
                                            ],
                                            pathRels: [
                                                { direction: "right", id: "9010", type: "PUBLISHED_IN" }
                                            ]
                                        },
                                        score: 0.95
                                    },
                                    {
                                        hop: 2,
                                        pathObj: {
                                            pathNodes: [
                                                { id: "622", label: "Person", name: "Laura Bennett", partitionID: "4" },
                                                { id: "620", label: "Book", name: "Crimson Echo", partitionID: "4" }
                                            ],
                                            pathRels: [
                                                { direction: "right", id: "9011", type: "WROTE" }
                                            ]
                                        },
                                        score: 0.81
                                    }
                                ]
                            },
                            {
                                id: "objC3",
                                query: "Which university did the CEO of TechNova Inc. graduate from?",
                                search_type: "SEMANTIC_BEAM_SEARCH",
                                results: [
                                    {
                                        hop: 2,
                                        pathObj: {
                                            pathNodes: [
                                                { id: "730", label: "Person", name: "Daniel Kim", partitionID: "5" },
                                                { id: "731", label: "Organization", name: "TechNova Inc.", partitionID: "5" }
                                            ],
                                            pathRels: [
                                                { direction: "left", id: "9020", type: "CEO_OF" }
                                            ]
                                        },
                                        score: 0.88
                                    },
                                    {
                                        hop: 3,
                                        pathObj: {
                                            pathNodes: [
                                                { id: "730", label: "Person", name: "Daniel Kim", partitionID: "5" },
                                                { id: "732", label: "University", name: "Stanford University", partitionID: "6" }
                                            ],
                                            pathRels: [
                                                { direction: "right", id: "9021", type: "GRADUATED_FROM" }
                                            ]
                                        },
                                        score: 0.93
                                    }
                                ]
                            }
                        ];


                        res.status(200).send(jsonResults);
                        clearTimeout(timeout);
                        resolve();
                    }
                    /* 8. Fatal errors */
                    else if (
                        msg.includes("Could not connect") ||
                        msg.includes("Socket") ||
                        msg.includes("ERROR")
                    ) {
                        tSocket.write("exit\n");
                        resolve();
                        res.status(400).send({ error: msg });
                    }

                });

                /* Kick off */
                tSocket.write(GRAPHRAG_QUERY_COMMAND + "\n");
            });
        });

    } catch (err) {
        console.error("❌ GraphRAG failed:", err);
        return res.status(500).send({
            code: ErrorCode.ServerError,
            message: ErrorMsg.ServerError,
            errorDetails: err
        });
    }
};

export const constructKGTXT = async (req: Request, res: Response) => {
    const connection = await getClusterDetails(req);
    if (!(connection.host && connection.port)) {
        return res.status(404).send(connection);
    }
    const UPLOAD_DIR = CACHE_DIR;

    console.log("79");
    if (!req.file) {
        return res.status(400).json({error: "No file uploaded"});
    }

    const customName = req.body.textFileName;
    if (!customName) {
        return res.status(400).json({error: "Missing textFileName"});
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".pdf" && ext !== ".txt") {
        return res.status(400).json({error: "Only .txt or .pdf allowed"});
    }

    const finalFilename = customName + ext;
    const finalPath = path.join(UPLOAD_DIR, finalFilename);

    if (fs.existsSync(finalPath)) {
        console.log("Duplicate file found:", finalFilename);

        let existingContent = "";

        if (ext === ".txt") {
            existingContent = fs.readFileSync(finalPath, "utf8");
        } else {
            const pdfData = fs.readFileSync(finalPath);
            const parsed = await pdfParse(pdfData);
            existingContent = parsed.text;

        }

        return res.json({
            status: "duplicate",
            filename: finalFilename,
            extractedText: existingContent
        });
    }

    // ----------------------------------------------------
    // STEP B: MOVE FILE FROM TMP → UPLOADS
    // ----------------------------------------------------
    await fs.promises.copyFile(req.file.path, finalPath);
    await fs.promises.unlink(req.file.path);
    // ----------------------------------------------------
    // STEP C: TEXT EXTRACTION
    // ----------------------------------------------------
    let extractedText = "";

    if (ext === ".txt") {
        extractedText = fs.readFileSync(finalPath, "utf8");
    } else {
        const pdfBuffer = fs.readFileSync(finalPath);
        const parsed = await pdfParse(pdfBuffer);
        extractedText = parsed.text;
    }

    const textFilePath = path.join(UPLOAD_DIR, customName + ".txt");
    fs.writeFileSync(textFilePath, extractedText, "utf8");





    const {
        llmRunnerString,    // "host:port"
        inferenceEngine,    // "ollama" | "vllm"
        model,              // model name
        chunkSize,          // bytes
    } = req.body;
    const downloadURI =  HOST +":"+PORT + "/public/" + customName + ".txt" ;
    console.log("downloadURI:", downloadURI);

    try {
        telnetConnection({ host: connection.host, port: connection.port })(() => {
            let completed = false;

            tSocket.on("data", async (buffer) => {
                const msg = buffer.toString("utf8").trim();
                console.log("Master:", msg);

                /* 1. Local file path */
                if (msg.includes("Local TXT file absolute path")) {
                    tSocket.write(downloadURI.trim() + "\n");
                }

                /* 2. LLM runner */
                else if (msg.includes("LLM runner hostname:port")) {
                    tSocket.write(llmRunnerString.trim() + "\n");
                }

                /* 3. Inference engine */
                else if (msg.includes("LLM inference engine")) {
                    tSocket.write(inferenceEngine.trim() + "\n");
                }

                /* 4. Model name */
                else if (msg.includes("LLM model name")) {
                    tSocket.write(model.trim() + "\n");
                }

                /* 5. Chunk size */
                else if (msg.includes("Chunk size")) {
                    tSocket.write(chunkSize.toString().trim() + "\n");
                }

                /* 6. Final Graph ID */
                else if (msg.startsWith("Graph Id:")) {
                    const newGraphId = msg.split(":")[1].trim();
                    completed = true;
                    tSocket.write("exit\n");
                    res.status(200).send({
                        message: "Knowledge Graph construction started",
                        graphId: newGraphId
                    });
                }

                /* Error handling from C++ */
                else if (
                    msg.includes("Invalid local file path") ||
                    msg.includes("Socket write failed")
                ) {
                    tSocket.write("exit\n");
                    return res.status(400).send({
                        code: ErrorCode.ServerError,
                        message: msg
                    });
                }
            });


            tSocket.write(CONSTRUCT_KG_COMMAND_LOCAL + "\n");
        });
    } catch (err) {
        console.error("❌ constructKGTXT failed:", err);
        return res.status(500).send({
            code: ErrorCode.ServerError,
            message: ErrorMsg.ServerError,
            errorDetails: err
        });
    }
};


export const stopConstructKG = async (req: Request, res: Response) => {
    const connection = await getClusterDetails(req);
    if (!(connection.host || connection.port)) {
        return res.status(404).send(connection);
    }
    const clusterId = req.header("Cluster-ID");
    const { graphId, status } = req.body;

    try {
        telnetConnection({ host: connection.host, port: connection.port })(() => {
            let commandOutput = "";
            req.setTimeout(0);
            tSocket.on("data", async (buffer) => {
                const msg = buffer.toString("utf8").trim();
                commandOutput += msg + "\n";

                if (msg.includes("done")) {
                    tSocket.write("exit\n");
                    console.log("✅ KG extraction stopped successfully");
                    res.status(200).send({ message: "Knowledge Graph construction Stopped" });
                }
            });

            tSocket.write(STOP_CONSTRUCT_KG_COMMAND + "\n");
        });
    } catch (err) {
        console.error("❌ Error in stopConstructKG:", err);
        return res
            .status(500)
            .send({ code: 500, message: "Server error", errorDetails: err });
    }
};

export const getKGConstructionMetaByGraphId = async (
    req: Request,
    res: Response
) => {
    const { graphId } = req.query;
    const clusterId = req.header("Cluster-ID");

    try {
        const metaData = await getKGConstructionMetaByClusterRepo(Number(clusterId));
        const filtered = metaData.filter((m) => m.graph_id === graphId);

        if (!filtered.length) {
            return res.status(404).json({
                message: `No KG construction metadata found for clusterId: ${clusterId} and graphId: ${graphId}`,
            });
        }

        return res.status(200).json({ data: filtered });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message:
                "Internal Server Error: Unable to fetch KG Construction Metadata for the given cluster and file path.",
            error: err instanceof Error ? err.message : "Unknown error occurred",
        });
    }
};

export const getOnProgressKGConstructionMeta = async (
    req: Request,
    res: Response
) => {
    const clusterId = req.header("Cluster-ID");

    try {
        const metaData = await getKGConstructionMetaByClusterRepo(Number(clusterId));
        const running = metaData.filter((m) => m.status === "running");
        const result = running.map((dbRow) => ({
            userId: dbRow.user_id,
            graphId: dbRow.graph_id,
            hdfsIp: dbRow.hdfs_ip,
            hdfsPort: dbRow.hdfs_port,
            hdfsFilePath: dbRow.hdfs_file_path,
            llmRunnerString: dbRow.llm_runner_string,
            inferenceEngine: dbRow.inference_engine,
            model: dbRow.model,
            chunkSize: dbRow.chunk_size,
            status: dbRow.status,
            message: dbRow.message,
            clusterId: dbRow.cluster_id,
        }));

        return res.status(200).json({ data: result });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message:
                "Internal Server Error: Unable to fetch KG Construction Metadata for the given cluster and file path.",
            error: err instanceof Error ? err.message : "Unknown error occurred",
        });
    }
};

export const updateKGConstructionMetaByClusterId = async (
    req: Request,
    res: Response
) => {
    const { clusterId, hdfsFilePath } = req.params;
    const updateData = req.body;

    try {
        const metaData = await getKGConstructionMetaByClusterRepo(Number(clusterId));
        const target = metaData.find((m) => m.hdfs_file_path === hdfsFilePath);

        if (!target) {
            return res.status(404).json({
                message: `No KG construction metadata found for clusterId: ${clusterId} and hdfsFilePath: ${hdfsFilePath}`,
            });
        }

        const updated = await updateKGConstructionMetaStatusRepo(
            target.id,
            updateData.status as KGStatus,
            updateData.message
        );

        return res.status(200).json({
            message: "KG Construction Metadata updated successfully",
            data: updated,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message:
                "Internal Server Error: Unable to update KG Construction Metadata for the given cluster and file path.",
            error: err instanceof Error ? err.message : "Unknown error occurred",
        });
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
        data.FileStatuses.FileStatus = data.FileStatuses.FileStatus.map((file) => file.pathSuffix);
        res.status(200).json(data.FileStatuses.FileStatus);
    } catch (err) {
        res.status(500).json({ error: 'Error connecting to Hadoop', details: err });
    }
};

const validateHDFS = async (req: Request, res: Response) => {
    const { ip, port, filePath } = req.body; // POST body
    if (!ip || !port || !filePath) {
        return res.status(400).json({ error: 'Missing ip, port, or filePath' });
    }

    try {
        // Encode path for URL
        const encodedPath = encodeURIComponent(filePath);
        const hadoopUrl = `http://${ip}:9870/webhdfs/v1${filePath}?op=GETFILESTATUS`;

        const response = await fetch(hadoopUrl);

        if (response.status === 200) {
            const data = await response.json();
            if (data?.FileStatus) {
                return res.status(200).json({ exists: true, fileStatus: data.FileStatus });
            } else {
                return res.status(404).json({ exists: false, message: 'File not found' });
            }
        } else if (response.status === 404) {
            return res.status(404).json({ exists: false, message: 'File not found' });
        } else {
            return res.status(response.status).json({ exists: false, message: 'Error fetching file' });
        }

    } catch (err) {
        console.error('HDFS validation error:', err);
        return res.status(500).json({ exists: false, error: 'Error connecting to HDFS', details: err });
    }
};

const constructKGHadoop = async (req: Request, res: Response) => {
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

            // Write the command to the Telnet server
            tSocket.write(TRIANGLE_COUNT_COMMAND + '|' + graph_id + '|' + priority + '\n', 'utf8', () => {
                setTimeout(() => {
                    if (commandOutput) {
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

export { getGraphList, uploadGraph, removeGraph, triangleCount, getGraphVisualization, getGraphData, getClusterProperties, getDataFromHadoop ,constructKGHadoop , validateHDFS};
