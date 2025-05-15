# Enhanced Solana Dusting Attack Detection System

## Overview

This system provides advanced detection capabilities for identifying dusting attacks on the Solana blockchain. It uses a combination of pattern recognition, machine learning, adaptive thresholds, and network analysis to identify both potential attackers and victims.

## Key Features

### 1. Advanced Pattern Recognition
- Temporal pattern analysis to detect time-based attack patterns
- Multi-hop relationship analysis to identify sophisticated attack networks
- Address similarity detection to identify address poisoning attempts

### 2. Machine Learning Integration
- Risk score prediction for both attackers and victims
- Feature extraction from transaction patterns
- Adaptive model training based on confirmed attack patterns

### 3. Adaptive Thresholds
- Dynamic adjustment of detection thresholds based on network conditions
- Congestion-aware dust amount thresholds
- Automatic calibration based on historical data

### 4. Real-time Monitoring and Alerting
- Discord webhook integration for real-time alerts
- Email notifications for high-risk attacks
- Configurable alert thresholds and notification channels

## Architecture

The system consists of several key components:

1. **Core Dust Detector** (`solana-dust-detector.ts`): Main processing engine that analyzes transactions and identifies potential dusting attacks.

2. **Database Layer** (`db/db-utils.ts`, `db/schema.sql`): Stores transaction data, attacker/victim profiles, and detection patterns.

3. **Machine Learning Module** (`ml-detection.ts`): Provides ML-based classification of potential attackers and victims.

4. **Adaptive Thresholds** (`adaptive-thresholds.ts`): Dynamically adjusts detection thresholds based on network conditions.

5. **Alert System** (`dust-alert-system.ts`): Provides real-time monitoring and notifications for detected attacks.

## Setup and Configuration

### Prerequisites
- Node.js (v16+)
- PostgreSQL database
- Solana RPC endpoint

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables (copy from env-sample.txt to .env):
   ```bash
   cp env-sample.txt .env
   # Edit .env with your specific configuration
   ```

3. Initialize the database:
   ```bash
   psql -U your_username -d your_database -f db/schema.sql
   ```

### Running the System

```bash
npm run dev  # Development mode
# or
npm run build && npm start  # Production mode
```

## Configuration Options

The system is highly configurable through environment variables. Key configuration options include:

- `DUST_AMOUNT_THRESHOLD`: Base threshold for considering a transaction as dust
- `ENABLE_ADAPTIVE_THRESHOLDS`: Enable/disable dynamic threshold adjustment
- `ENABLE_ALERTS`: Enable/disable the alert system
- `DISCORD_WEBHOOK_URL`: Webhook URL for Discord notifications
- `ENABLE_ML_DETECTION`: Enable/disable machine learning-based detection
- `NETWORK_ANALYSIS_DEPTH`: Depth of network relationship analysis

See the env-sample.txt file for a complete list of configuration options.

## Future Enhancements

- Integration with more blockchain explorers for enhanced data collection
- Improved visualization of attack patterns and networks
- Expanded ML model with more sophisticated features
- Support for additional notification channels
- Integration with decentralized identity systems for reputation tracking
