const { exec, spawn } = require('child_process');
const fetch = require('node-fetch');
const chalk = require('chalk');
const ora = require('ora');
const waitOn = require('wait-on');

async function checkOllama() {
  const spinner = ora('Checking Ollama...').start();
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (res.ok) {
      spinner.succeed(chalk.green('Ollama Running'));
      const data = await res.json();
      const hasModel = data.models.some(m => m.name.includes('qwen3:4b-instruct'));
      if (hasModel) {
        console.log(chalk.green('✓ Model Loaded (qwen3:4b-instruct)'));
        return true;
      } else {
        spinner.warn(chalk.yellow('Model qwen3:4b-instruct not found.'));
        console.log(chalk.yellow('Please run: ollama run qwen3:4b-instruct'));
        return false;
      }
    }
  } catch (err) {
    spinner.fail(chalk.red('Ollama is not running. Attempting to start Ollama...'));
    return false;
  }
}

function startBackend() {
  console.log(chalk.blue('Starting FastAPI Backend...'));
  const backend = spawn('npm', ['run', 'backend'], { stdio: 'inherit', shell: true });
  return backend;
}

function startFrontend() {
  console.log(chalk.blue('Starting React Frontend...'));
  const frontend = spawn('npm', ['run', 'frontend'], { stdio: 'inherit', shell: true });
  return frontend;
}

async function main() {
  console.clear();
  console.log(chalk.cyan.bold('\n🚀 Starting Nova AI Agent Environment...\n'));

  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    console.log(chalk.yellow('Waiting for Ollama/Model... Please ensure Ollama is running and model is loaded.'));
  }

  const backendProcess = startBackend();

  console.log(chalk.yellow('Waiting for FastAPI to be ready...'));
  try {
    await waitOn({
      resources: ['http-get://127.0.0.1:8000/health'],
      timeout: 30000,
    });
    console.log(chalk.green('✓ FastAPI Ready'));
  } catch (err) {
    console.error(chalk.red('❌ Backend failed to start.'));
    process.exit(1);
  }

  startFrontend();
  
  console.log(chalk.green.bold('\n✨ Nova AI Agent Ready!\n'));
}

main().catch(console.error);
