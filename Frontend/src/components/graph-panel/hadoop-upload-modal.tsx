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
import React, { useState } from 'react';
import { Modal, List, Checkbox, Button } from 'antd';

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const HadoopUploadModal = ({ open, setOpen }: Props) => {
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

    const handleOk = () => {
        console.log('Selected files:', selectedFiles);


        setOpen(false);
    };

    const handleCancel = () => {
        setOpen(false);
    };

    const handleConnect = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const target = e.target as typeof e.target & {
            ip: { value: string };
            port: { value: string };
        };
        const ip = target.ip.value;
        const port = target.port.value;
        const clusterId = localStorage.getItem('selectedCluster') || '';

        const res = await fetch(`backend/graph/hadoop?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`, {
            method: 'GET',
            headers: { 'Cluster-ID': clusterId }
        });
        const data = await res.json();
        setFileNames(data);
    };

    const toggleFile = (file: string) => {
        setSelectedFiles(prev =>
            prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file]
        );
    };

    return (
        <Modal title="Hadoop HDFS" open={open} onOk={handleOk} onCancel={handleCancel} footer={[
            <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
            <Button key="ok" type="primary" onClick={handleOk}>OK</Button>
        ]}>
            <form onSubmit={handleConnect}>
                <label>
                    IP:
                    <input name="ip" type="text" required />
                </label>
                <br />
                <label>
                    Port:
                    <input name="port" type="number" required />
                </label>
                <br />
                <button type="submit">Connect</button>
            </form>

            {fileNames.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '16px' }}>
                    <List
                        dataSource={fileNames}
                        renderItem={file => (
                            <List.Item>
                                <Checkbox
                                    checked={selectedFiles.includes(file)}
                                    onChange={() => toggleFile(file)}
                                >
                                    {file}
                                </Checkbox>
                            </List.Item>
                        )}
                    />
                    <Button
                        type="primary"
                        style={{ marginTop: '16px' }}
                        disabled={selectedFiles.length === 0}
                        onClick={handleOk}
                    >
                        Upload
                    </Button>
                </div>
            )}
        </Modal>
    );
};

export default HadoopUploadModal;