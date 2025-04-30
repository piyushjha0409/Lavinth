# SolanaShield: Secure Your Solana Ecosystem

## Overview

SolanaShield is an advanced security platform designed to protect Solana blockchain users, developers, and applications from common attack vectors including account dusting and address poisoning. By providing real-time detection and prevention mechanisms, SolanaShield helps maintain the integrity of the Solana ecosystem and enhances user safety.

## Details

SolanaShield addresses critical security challenges in the Solana ecosystem:

1. **Dusting Attacks**: Identifies and filters unsolicited token transfers that often promote scam services or malicious websites.

2. **Address Poisoning**: Alerts users to sophisticated phishing tactics that manipulate transaction histories by sending zero-value transactions from lookalike addresses.

3. **Transaction Filtering**: Provides a real-time API to filter out malicious activity before it reaches end users.

4. **Security Intelligence**: Visualizes the prevalence, patterns, and trends of attack vectors across the Solana ecosystem through a comprehensive dashboard.

## How to Setup the Project Locally

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/solana-shield.git
   cd solana-shield
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   ```

3. Configure environment variables by creating a `.env` file based on the example provided:
   ```
   # Database configuration
   DB_USERNAME=your_db_username
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   DB_HOST=localhost
   
   # Solana configuration
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

4. Build and start the backend:
   ```bash
   npm run build
   npm start
   ```
   For development with hot-reloading:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:3000`

## Features

### 1. Dusting Detection

Identifies and filters unsolicited token transfers promoting scam services or malicious websites. The system analyzes transaction patterns and token metadata to determine potential dusting attempts.

### 2. Address Poisoning Prevention

Alerts users to sophisticated phishing tactics that manipulate transaction histories by sending zero-value transactions from lookalike addresses, preventing users from accidentally copying and using these malicious addresses for future transactions.

### 3. Transaction Filtering

Provides a real-time API that allows wallet providers, exchanges, and other Solana applications to filter out malicious activity before it reaches end users, enhancing their security posture without developing specialized security expertise.

### 4. Security Dashboard

Visualizes the prevalence, patterns, and trends of attack vectors across the Solana ecosystem, giving developers and users insights into the security landscape and enabling proactive protection measures.

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS, Radix UI components
- **Backend**: Node.js, Express, TypeScript, Solana web3.js
- **Database**: PostgreSQL with Sequelize ORM
- **Blockchain Integration**: Solana Web3.js

## Contributors

- Boston - Founding member
- WhyParabola - Founding member
- KshitijHash - Founding member
