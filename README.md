# AI Governance Agent for Polkadot DAO

An advanced AI-powered governance agent that helps DAOs make informed decisions by analyzing proposals, engaging in meaningful discussions with proposers, and casting votes based on the DAO's best interests.

## Features

- 🤖 **AI-Powered Analysis**: Analyzes governance proposals using advanced NLP to evaluate alignment with DAO goals
- 💬 **Interactive Discussion**: Engages with proposers through a real-time chat interface to better understand proposals
- 🗳️ **Automated Voting**: Casts on-chain votes when convinced of a proposal's merit
- 🔗 **Polkadot Integration**: Seamlessly interacts with Polkadot governance system
- 👥 **Delegation System**: Allows token holders to delegate voting power to the AI agent

## Key Goals Evaluated

The AI agent evaluates proposals based on Polkadot DAO's key objectives:

1. **Technical Innovation**: Network capabilities, scalability, and security improvements
2. **Ecosystem Growth**: Projects expanding the Polkadot ecosystem
3. **Community Benefit**: Initiatives benefiting token holders and community
4. **Economic Sustainability**: Responsible treasury management
5. **Decentralization**: Network decentralization improvements

## Setup

### Prerequisites

- Node.js 18.x or later
- A Polkadot account with some DOT for testing
- OpenAI API key for AI functionality

### Environment Variables

Create a `.env` file with the following:

```env
OPENAI_API_KEY=your_openai_api_key
AGENT_SEED_PHRASE=your_polkadot_account_seed_phrase
```

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```

## Usage

### Loading Proposals

1. Click "Load Proposal" on the homepage
2. Enter a valid Polkadot proposal ID
3. The proposal will be fetched from Polkassembly and analyzed by the AI

### Delegating Voting Power

1. Install the Polkadot.js browser extension
2. Click "Delegate Voting Power" in the agent info section
3. Connect your wallet when prompted
4. Select your address and enter the amount to delegate
5. Confirm the transaction in your wallet

### Discussing Proposals

1. Click "Discuss" on any proposal card
2. Enter your message in the chat interface
3. The AI agent will respond and evaluate your arguments
4. If convinced, the agent will automatically cast an on-chain vote

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Blockchain**: Polkadot.js API
- **AI**: OpenAI GPT-4
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket for chat functionality

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
