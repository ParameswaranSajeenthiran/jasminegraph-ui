"use client";

import { Layout, theme } from "antd";
import ConfigPanel from "./ConfigPanel";
import ChatPanel from "./ChatPanel";
import VisualizationPanel from "./VisualizationPanel";

export default function GraphRagLayout() {
    const { Content } = Layout;

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    return (
        <Layout style={{ padding: "24px 24px", height: "92vh" }}>
            <Content
                style={{
                    padding: 24,
                    margin: 0,
                    minHeight: 280,
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG,
                }}
            >
                <div className="flex h-full bg-gray-50">
                    <ConfigPanel />
                    <ChatPanel />
                    <VisualizationPanel />
                </div>
            </Content>
        </Layout>
    );
}
