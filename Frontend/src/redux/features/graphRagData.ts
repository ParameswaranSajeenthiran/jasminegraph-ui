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
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/* =========================
   Types
========================= */

export interface IChatMessage {
    role: "user" | "assistant";
    content: string;
    ragResult?: IRagResult;
    id: string;

}

export interface PathNode {
    id: string;
    label: string;
    name: string;
    partitionID: string;
}

export interface PathRel {
    direction: string;
    id: string;
    type: string;
}

export interface ObjectiveResult {
    hop: number;
    pathObj: {
        pathNodes: PathNode[];
        pathRels: PathRel[];
    };
    score: number;
}

export interface Objective {
    id: string;
    query: string;
    search_type: string;
    retrieved_paths: ObjectiveResult[];
}

export interface IRagResult {
    answer: string;
    plan_type?: string;
    objectives?: Objective[];
}

interface IGraphRagState {
    selectedGraph: string | null;
    selectedModel: string;
    chatHistory: (IChatMessage & {
        id: string;
        ragResult?: IRagResult;
    })[]
    activeMessageId: string | null
    loading: boolean;
    selectedProvider: string;
    providerURL: string;
    configCollapsed: boolean;
}

/* =========================
   Initial State
========================= */

const initialState: IGraphRagState = {
    selectedGraph: null,
    selectedModel: "gemma3:12b",
    chatHistory: [],
    activeMessageId: null,
    loading: false,
    selectedProvider: "Ollama",
    providerURL: "http://localhost:11435",
    configCollapsed: false,
};

/* =========================
   Slice
========================= */

export const graphRagDataSlice = createSlice({
    name: "graphRagData",
    initialState,
    reducers: {
        set_Selected_Graph: (state, action: PayloadAction<string | null>) => {
            state.selectedGraph = action.payload;
        },

        set_Selected_Model: (state, action: PayloadAction<string>) => {
            state.selectedModel = action.payload;
        },

        add_Chat_Message: (state, action: PayloadAction<IChatMessage>) => {
            state.chatHistory.push(action.payload);
        },

        clear_Chat_History: (state) => {
            state.chatHistory = [];
        },

        // set_Rag_Result: (state, action: PayloadAction<IRagResult | null>) => {
        //     state.ragResult = action.payload;
        // },

        set_Loading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },

        set_Provider_URL: (state, action: PayloadAction<string>) => {
            state.providerURL = action.payload;
        },

        set_Selected_Provider: (state, action: PayloadAction<string>) => {
            state.selectedProvider = action.payload;
        },
        set_Config_Collapsed: (state, action: PayloadAction<boolean>) => {
            state.configCollapsed = action.payload;
        },
        set_Active_Message: (state, action: PayloadAction<string>) => {
            state.activeMessageId = action.payload;
        },

        attach_Rag_To_Message: (
            state,
            action: PayloadAction<{ id: any; ragResult: IRagResult }>
        ) => {
            const msg = state.chatHistory.find(m => m.id === action.payload.id);
            if (msg) msg.ragResult = action.payload.ragResult;
        },
    },
});

export const {
    set_Selected_Graph,
    set_Selected_Model,
    add_Chat_Message,
    clear_Chat_History,

    set_Loading,
    set_Provider_URL,
    set_Selected_Provider,
    set_Config_Collapsed,
    set_Active_Message,
    attach_Rag_To_Message
} = graphRagDataSlice.actions;

export default graphRagDataSlice.reducer;