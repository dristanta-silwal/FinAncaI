# Analyst Ledger

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dristanta-silwal/FinAncaI)

Analyst Ledger is a full-stack AI financial analysis platform built on Cloudflare. It provides a seamless workflow for ingesting raw financial documents (like PDF bank statements), processing them through an intelligent ETL pipeline, and generating insightful, analyst-grade reports. The system is composed of three core components: 1) A File Ingest Worker that provides a secure API endpoint for file uploads, writing them directly to an R2 bucket. 2) An R2-triggered ETL Worker that consumes a queue, parses documents using 'unpdf', normalizes and deduplicates transactions, categorizes them using Workers AI, and upserts the structured data into a D1 database. 3) A sophisticated React-based UI with a stark, brutalist design, offering a drag-and-drop interface for data ingestion, powerful data visualizations for statement analysis, and a dedicated view for generating and reviewing AI-powered analyst reports.

## Key Features

- **Secure File Ingest**: An API gateway worker handles multipart file uploads and writes directly to R2 using signed URLs.
- **Event-Driven ETL Pipeline**: An R2 `ObjectCreate` event triggers a Workers Queue, decoupling ingestion from processing.
- **Intelligent Document Parsing**: Leverages `unpdf` to extract structured data from PDF bank statements.
- **AI-Powered Categorization**: Uses Workers AI via the AI Gateway for transaction categorization and anomaly detection.
- **Robust Data Storage**: Utilizes Cloudflare D1 for storing structured financial data like accounts, transactions, and holdings.
- **Stunning Brutalist UI**: A high-contrast, visually striking user interface built with React, Tailwind CSS, and Shadcn/UI.
- **Insightful Visualizations**: Interactive charts powered by Recharts to visualize financial health and statement data.
- **Analyst-Grade Reporting**: Generates comprehensive monthly reports in markdown format, ready for export.

## Technology Stack

- **Frontend**:
    - [React](https://react.dev/)
    - [Vite](https://vitejs.dev/)
    - [Tailwind CSS](https://tailwindcss.com/)
    - [Shadcn/UI](https://ui.shadcn.com/)
    - [Recharts](https://recharts.org/)
    - [React Dropzone](https://react-dropzone.js.org/)
- **Backend**:
    - [Cloudflare Workers](https://workers.cloudflare.com/)
    - [Hono](https://hono.dev/)
    - [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQL Database)
    - [Cloudflare R2](https://developers.cloudflare.com/r2/) (Object Storage)
    - [Cloudflare Queues](https://developers.cloudflare.com/queues/)
    - [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- **Tooling**:
    - [TypeScript](https://www.typescriptlang.org/)
    - [Bun](https://bun.sh/)
    - [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Bun](https://bun.sh/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd analyst_ledger
    ```

2.  **Install dependencies:**
    ```sh
    bun install
    ```

3.  **Set up environment variables:**
    Create a `.dev.vars` file in the root of the project and add your Cloudflare credentials. This file is used by Wrangler for local development.

    ```ini
    CF_AI_BASE_URL="https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/openai"
    CF_AI_API_KEY="your-cloudflare-api-key"
    ```

4.  **Configure Cloudflare Resources:**
    You will need to create D1, R2, and Queue bindings for the project. Update your `wrangler.toml` or `wrangler.jsonc` file with the necessary bindings.

    Example `wrangler.toml` additions:
    ```toml
    [[d1_databases]]
    binding = "DB"
    database_name = "analyst-ledger-db"
    database_id = "<your_database_id>"

    [[r2_buckets]]
    binding = "UPLOADS_BUCKET"
    bucket_name = "analyst-ledger-uploads"

    [[queues.producers]]
    queue = "etl-queue"
    binding = "ETL_QUEUE"

    [[queues.consumers]]
    queue = "etl-queue"
    ```

5.  **Run D1 Migrations:**
    Apply the database schema to your local D1 database.
    ```sh
    wrangler d1 migrations apply analyst-ledger-db --local
    ```

### Development

To start the local development server, which includes both the Vite frontend and the Cloudflare Worker backend, run:

```sh
bun run dev
```

This will start the application on `http://localhost:3000` (or the port specified in your environment).

## Usage

Once the application is running, you can access the different views:

1.  **Data Ingest**: Navigate to the "Data Ingest" view. Drag and drop a financial statement (PDF) into the dropzone to begin the upload process.
2.  **Statement Visualizer**: After a file has been processed, this view will display charts and metrics based on the extracted data.
3.  **Analyst Report**: This view shows AI-generated insights and allows you to generate a full monthly report.

## Deployment

Deploying the application to the Cloudflare global network is straightforward.

1.  **Login to Wrangler:**
    If you haven't already, authenticate Wrangler with your Cloudflare account.
    ```sh
    wrangler login
    ```

2.  **Deploy the application:**
    Run the deploy script, which will build the application and deploy it using Wrangler.
    ```sh
    bun run deploy
    ```

Wrangler will handle bundling the frontend, deploying the worker, and updating your Cloudflare resources as defined in `wrangler.toml`/`wrangler.jsonc`.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dristanta-silwal/FinAncaI)

## License

This project is licensed under the MIT License.