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

import mongoose, { Schema, Model, Document } from 'mongoose';

type LLMRunner = {
    runner: string;
    chunks: number;
};

type KGConstructionMetaDocument = Document & {
    graphId: string;
    hdfsIp: string;
    hdfsPort: number;
    hdfsFilePath: string;
    llmRunnerString: LLMRunner[];
    inferenceEngine: string;
    model: string;
    chunkSize: number;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
    userId: string;
    message?: string;
    clusterId: string;
};

type KGConstructionMetaInput = Omit<KGConstructionMetaDocument, keyof Document>;

const kgConstructionMetaSchema = new Schema(
    {graphId: {
            type: String,
            required: true,
        },
        hdfsIp: {
            type: String,
            required: true,
        },
        hdfsPort: {
            type: Number,
            required: true,
        },
        hdfsFilePath: {
            type: String,
            required: true,
        },
        llmRunnerString: {
            type: String,
            required: true,
        },
        inferenceEngine: {
            type: String,
            required: true,
        },
        model: {
            type: String,
            required: true,
        },
        chunkSize: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'running', 'paused', 'completed', 'failed', 'stopped'],
            default: 'pending',
            required: true,
        },
        userId: {
            type: String,
            required: false,
            ref: 'User',
        },
        message: {
            type: String,
            default: '',
        },
        clusterId: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
    },
);

// Optional: Index status for quick filtering
kgConstructionMetaSchema.index({ status: 1 });

const KGConstructionMeta: Model<KGConstructionMetaDocument> =
    mongoose.model<KGConstructionMetaDocument>('KGConstructionMeta', kgConstructionMetaSchema);

export { KGConstructionMeta, KGConstructionMetaInput, KGConstructionMetaDocument };
