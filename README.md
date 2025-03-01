# AI Governance Agent for Polkadot DAO

An advanced AI-powered governance platform that revolutionizes decentralized decision-making through intelligent proposal analysis, real-time communication, and automated voting mechanisms for the Polkadot ecosystem.

## Overview

The AI Governance Agent serves as an intelligent mediator in the Polkadot DAO ecosystem, analyzing proposals, engaging with stakeholders, and making informed voting decisions. It combines advanced natural language processing with blockchain integration to create a transparent and efficient governance process.

## Demo

[ai-governance-framework-nikhilranjan2.replit.app](https://ai-governance-framework-nikhilranjan2.replit.app/)

## Key Features

### 🤖 AI-Powered Analysis
- Real-time proposal analysis using GPT-4
- Semantic understanding of governance implications
- Automated scoring system (0-100) based on network benefit
- Context-aware discussion capabilities

### 💬 Interactive Communication
- Real-time WebSocket-based chat interface
- Intelligent response generation
- Proposal context preservation
- Multi-user support with concurrent chat sessions

### 🗳️ Advanced Voting Mechanism
- 6x conviction voting implementation
- Automated on-chain voting execution
- Transaction verification and tracking
- Vote result persistence and display

### 🔗 Polkadot Integration
- Direct chain interaction via Polkadot.js API
- Real-time proposal fetching from Polkassembly
- Secure wallet connection via browser extension
- Transaction monitoring and status updates

### 👥 Delegation System
- User-friendly delegation interface
- Flexible voting power management
- Secure delegation transactions
- Real-time balance updates

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **TailwindCSS** with shadcn/ui for beautiful, responsive UI
- **TanStack Query** for efficient server state management
- **WebSocket** integration for real-time updates
- **Polkadot.js** extension integration for wallet connectivity

### Backend Infrastructure
- **Node.js** with Express for robust API handling
- **WebSocket Server** for real-time communication
- **SQLite** database with Drizzle ORM for data persistence
- **OpenAI GPT-4** integration for intelligent analysis
- **Polkadot.js API** for blockchain interaction

### Key Integrations
- **Polkassembly API**: For proposal data fetching
- **OpenAI API**: For proposal analysis and chat
- **Polkadot Network**: For on-chain voting and delegation
- **WebSocket Protocol**: For real-time updates

## Getting Started

### Prerequisites
```bash
# Required software
- Node.js 18.x or later
- A modern web browser
- Polkadot.js browser extension
```

### Environment Setup
Create a `.env` file with:
```env
OPENAI_API_KEY=your_openai_api_key
AGENT_SEED_PHRASE=your_polkadot_account_seed_phrase
```

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage Guide

### Loading Proposals
1. Click "Load Proposal" in the agent info section
2. Enter a valid Polkadot proposal ID
3. Wait for AI analysis and scoring
4. View detailed proposal information

### Delegating Votes
1. Install the Polkadot.js browser extension
2. Connect your wallet through the "Delegate Voting Power" button
3. Select your address and specify delegation amount
4. Confirm the transaction in your wallet

### Discussing Proposals
1. Navigate to any proposal's chat interface
2. Enter your questions or comments
3. Receive AI-generated responses
4. View voting decisions and rationale

## Advanced Features

### Conviction Voting
The platform implements Polkadot's 6x conviction voting mechanism:
- Higher conviction = greater voting power
- Lock tokens for longer periods
- Automated conviction calculation

### AI Analysis Metrics
Proposals are evaluated based on:
1. Technical Innovation (25%)
2. Economic Impact (25%)
3. Community Benefit (25%)
4. Implementation Feasibility (25%)

### Real-time Updates
- WebSocket-based live updates
- Instant chat responses
- Transaction status monitoring
- Vote result broadcasting

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Security

- All API keys and private keys are securely managed
- Wallet connections use industry-standard security
- AI responses are sanitized for XSS prevention
- Real-time communication is encrypted

## License

This project is licensed under the MIT License - see the LICENSE file for details.