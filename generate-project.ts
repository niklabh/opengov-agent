#!/usr/bin/env node
import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

interface ProjectConfig {
  systemPrompt: string;
  rpcUrl: string;
  projectName: string;
  openaiModel: string;
  convictionVoting: boolean;
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nProject generation cancelled. Goodbye!'));
  process.exit(0);
});

async function getProjectConfig(): Promise<ProjectConfig> {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Enter the project name:',
        default: 'ai-governance-agent',
        validate: (input: string) => {
          if (/^[a-z0-9-]+$/.test(input)) return true;
          return 'Project name can only contain lowercase letters, numbers, and hyphens';
        }
      },
      {
        type: 'input',
        name: 'systemPrompt',
        message: 'Enter the system prompt for the AI agent:',
        default: 'You are an AI Governance Agent for the Polkadot DAO. Your role is to evaluate governance proposals and vote according to the DAO\'s best interests.',
      },
      {
        type: 'input',
        name: 'rpcUrl',
        message: 'Enter the RPC URL for the blockchain:',
        default: 'wss://rpc.polkadot.io',
        validate: (input: string) => {
          if (input.startsWith('ws://') || input.startsWith('wss://')) return true;
          return 'RPC URL must start with ws:// or wss://';
        }
      },
      {
        type: 'list',
        name: 'openaiModel',
        message: 'Select the OpenAI model to use:',
        choices: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
        default: 'gpt-4-turbo-preview'
      },
      {
        type: 'confirm',
        name: 'convictionVoting',
        message: 'Enable conviction voting?',
        default: true
      }
    ]);

    return answers;
  } catch (error: any) {
    if (error.isTtyError) {
      console.error(chalk.red('\nError: This tool requires an interactive terminal.'));
      process.exit(1);
    }
    if (error.message.includes('User force closed')) {
      console.log(chalk.yellow('\nProject generation cancelled. Goodbye!'));
      process.exit(0);
    }
    console.error(chalk.red('\nAn unexpected error occurred:'), error.message);
    process.exit(1);
  }
}

async function generateProject(config: ProjectConfig) {
  const sourceDir = process.cwd();
  const targetDir = path.join(process.cwd(), '..', config.projectName);

  try {
    // Create project directory
    console.log(chalk.blue('\nCreating project directory...'));
    await fs.ensureDir(targetDir);

    // Copy project files
    console.log(chalk.blue('Copying project files...'));
    await fs.copy(sourceDir, targetDir, {
      filter: (src) => {
        const relativePath = path.relative(sourceDir, src);
        // Skip unnecessary files/folders
        return !relativePath.includes('node_modules') &&
               !relativePath.includes('.git') &&
               !relativePath.includes('database.sqlite') &&
               !relativePath.startsWith('.');
      }
    });

    // Update AI service configuration
    console.log(chalk.blue('Configuring AI service...'));
    const aiServicePath = path.join(targetDir, 'server', 'services', 'ai.ts');
    let aiServiceContent = await fs.readFile(aiServicePath, 'utf8');

    aiServiceContent = aiServiceContent
      .replace(/const SYSTEM_PROMPT = `.*`;/s, `const SYSTEM_PROMPT = \`${config.systemPrompt}\`;`)
      .replace(/"gpt-4-turbo-preview"/g, `"${config.openaiModel}"`);

    await fs.writeFile(aiServicePath, aiServiceContent);

    // Update RPC URL
    console.log(chalk.blue('Updating blockchain configuration...'));
    const routesPath = path.join(targetDir, 'server', 'routes.ts');
    let routesContent = await fs.readFile(routesPath, 'utf8');

    routesContent = routesContent.replace(
      /const wsProvider = new WsProvider\(".*"\);/,
      `const wsProvider = new WsProvider("${config.rpcUrl}");`
    );

    await fs.writeFile(routesPath, routesContent);

    // Create .env.example
    const envExample = `
OPENAI_API_KEY=your_openai_api_key
AGENT_SEED_PHRASE=your_polkadot_account_seed_phrase
    `.trim();

    await fs.writeFile(path.join(targetDir, '.env.example'), envExample);

    // Success message and next steps
    console.log(chalk.green('\n✨ Project generated successfully!'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.white('1. cd'), chalk.cyan(config.projectName));
    console.log(chalk.white('2. npm install'));
    console.log(chalk.white('3. Copy .env.example to .env and fill in your API keys'));
    console.log(chalk.white('4. npm run dev'));

  } catch (error: any) {
    console.error(chalk.red('\nError generating project:'), error.message);
    // Cleanup on failure
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
      console.log(chalk.yellow('Cleaned up incomplete project directory.'));
    }
    process.exit(1);
  }
}

async function main() {
  program
    .name('generate-governance-agent')
    .description(chalk.cyan(
      'Generate a customized AI governance agent project\n\n' +
      'This tool will help you create a new instance of the AI Governance Agent\n' +
      'with your custom configuration for system prompts, blockchain connections,\n' +
      'and other settings.'
    ))
    .version('1.0.0')
    .addHelpText('after', `
Example:
  $ npx tsx generate-project.ts

The tool will prompt you for:
  - Project name (lowercase letters, numbers, and hyphens only)
  - System prompt for the AI agent
  - RPC URL for blockchain connection (ws:// or wss://)
  - OpenAI model selection
  - Conviction voting configuration

Your customized project will be created in a new directory.
    `);

  program.parse();

  try {
    console.log(chalk.cyan('\n🤖 AI Governance Agent Generator\n'));
    const config = await getProjectConfig();
    await generateProject(config);
  } catch (error: any) {
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('\nFatal error:'), error.message);
  process.exit(1);
});