# StockAnalysisFullStack

一个基于 Python FastAPI、CrewAI 和 React 的全栈股票分析应用。

## 项目概述

本项目利用 AI Agents 模拟专业的投研团队，对用户输入的股票代码进行全方位的分析。
- **后端**：使用 CrewAI 编排多个 Agent（市场研究员、基本面分析师、技术分析师、投资顾问），通过 AKShare 获取实时行情。
- **前端**：使用 React + TailwindCSS 构建现代化仪表盘，集成 `kline-charts` 展示专业 K 线图。

## 功能特性

1. **多 Agent 协同分析**：自动获取数据、分析财报、研判趋势，生成综合投资建议。
2. **专业 K 线图表**：支持日K展示，集成 MA、VOL 等技术指标。
3. **实时数据获取**：后端集成 AKShare，直连 A 股行情数据。
4. **现代化 UI**：响应式设计，良好的交互体验。

## 快速开始

### 前置要求

- Python 3.10+
- Node.js 18+
- OpenAI API Key (用于驱动 CrewAI)

### 1. 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入你的 OPENAI_API_KEY
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```
后端服务将在 http://localhost:8000 启动。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```
前端服务将在 http://localhost:5173 启动。

### 4. 使用

打开浏览器访问 http://localhost:5173，在搜索框输入股票代码（例如 `sh600519` 贵州茅台），点击分析即可。

## 项目结构

```
StockAnalysisFullStack/
├── backend/            # FastAPI 后端 & CrewAI Agents
├── frontend/           # React 前端
└── docker-compose.yml  # Docker 部署配置
```

## 注意事项

- 确保你的网络环境可以访问 OpenAI API。
- AKShare 数据接口可能会有变动，如果获取数据失败，请检查 AKShare 版本或网络连接。
