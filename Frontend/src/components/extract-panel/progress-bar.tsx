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
import React from "react";
import { theme } from "antd";

interface SegmentedProgressProps {
    progress: number;   // 0–100
    segments?: number;  // number of boxes (default 20)
}

const SegmentedProgress: React.FC<SegmentedProgressProps> = ({ progress, segments = 50 }) => {
    const {
        token: { colorPrimary, colorBorder, colorBgContainer }
    } = theme.useToken();

    const filled = Math.round((progress / 100) * segments);

    return (
        <div
            style={{
                display: "flex",
                border: `1px solid ${colorBorder}`,
                borderRadius: 4,
                padding: "4px",
                width: "100%",
                justifyContent: "space-between",
                background: colorBgContainer,
            }}
        >
            {Array.from({ length: segments }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        height: "75px",
                        margin: "0 2px",
                        backgroundColor: i < filled ? colorPrimary : "#f0f0f0",
                        borderRadius: 2,
                        transition: "background-color 0.3s ease",
                    }}
                />
            ))}
        </div>
    );
};

export default SegmentedProgress;
