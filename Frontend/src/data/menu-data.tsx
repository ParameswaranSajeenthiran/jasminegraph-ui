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

import type { MenuProps } from 'antd';
import { ContainerOutlined, CodeSandboxOutlined,SecurityScanOutlined, AlignLeftOutlined, DeploymentUnitOutlined, AreaChartOutlined } from '@ant-design/icons';
import * as Routes from "@/routes/page-routes";

type MenuItem = Required<MenuProps>['items'][number];

export const ClusterTopMenu: MenuItem[] = [
  {
    label: 'Cluster Details',
    key: Routes.CLUSTER_PAGE_ROUTES.clusterDetails,
    icon: <ContainerOutlined />,
  },
  {
    label: 'Access Management',
    key: Routes.CLUSTER_PAGE_ROUTES.accessManagement,
    icon: <SecurityScanOutlined />,
  },
  {
    label: 'Instance',
    key: Routes.CLUSTER_PAGE_ROUTES.instance,
    icon: <CodeSandboxOutlined />,
  },
  {
    label: 'Deployment',
    key: Routes.CLUSTER_PAGE_ROUTES.deployment,
    icon: <DeploymentUnitOutlined />,
    disabled: true,
  },
  {
    label: 'Logs',
    key: Routes.CLUSTER_PAGE_ROUTES.logs,
    icon: <AlignLeftOutlined />,
    disabled: true,
  },
];

export const GraphPanelMenu: MenuItem[] = [
  {
    label: 'Upload',
    key: Routes.GRAPH_PANEL_ROUTES.upload,
    icon: <ContainerOutlined />,
  },
    {
        label: 'Extract',
        key: Routes.GRAPH_PANEL_ROUTES.extract,
        icon: <ContainerOutlined />,
    },
  {
    label: 'Graph',
    key: Routes.GRAPH_PANEL_ROUTES.graph,
    icon: <CodeSandboxOutlined />,
  },
  {
    label: 'Distribution',
    key: Routes.GRAPH_PANEL_ROUTES.distribution,
    icon: <DeploymentUnitOutlined />,
  },
];

export const QueryInterfaceMenu: MenuItem[] = [
  {
    label: 'Cypher',
    key: Routes.QUERY_PANEL_ROUTES.query,
    icon: <ContainerOutlined />,
  },
    {
        label: 'Semantic Beam Search',
        key: Routes.QUERY_PANEL_ROUTES.semantic_beam_search,
        icon: <ContainerOutlined />,
    },
  {
    label: 'Graph Properties',
    key: Routes.QUERY_PANEL_ROUTES.properties,
    icon: <AreaChartOutlined />,
  },
  {
    label: 'Console',
    key: Routes.QUERY_PANEL_ROUTES.console,
    icon: <CodeSandboxOutlined />,
  },
];
