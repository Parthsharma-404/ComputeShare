# ComputeShare

ComputeShare is a distributed computing platform that allows donor nodes to contribute their computing power to execute partitioned tasks.

## Project Structure

This project has been restructured into separate directories:

- **`frontend/`**: The frontend React web application built with Vite.
- **`backend/`**: The backend central coordinator server built with Express and Socket.io.
- **`README.md`**: This configuration and setup guide.
- **`.gitignore`**: Git ignore rules.

---

## Getting Started

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Running the Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Start the coordinator server:
   ```bash
   npm run dev
   ```
   The coordinator will start listening on port `3001`.

### 3. Running the Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
  
