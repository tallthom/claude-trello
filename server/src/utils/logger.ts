import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

interface LogContext {
  [key: string]: any;
}

// Check if logging is enabled via TRELLO_MCP_LOGGING environment variable
const loggingEnabled = process.env.TRELLO_MCP_LOGGING === 'true';

// Get the directory where index.js is located (dist/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = dirname(__dirname); // Go up from utils/ to dist/
const logsDir = join(distDir, 'logs');
const logFilePath = join(logsDir, 'app.log');

// Map environment log level to pino level
function getPinoLevel(): pino.Level {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  switch (envLevel) {
    case 'debug':
      return 'debug';
    case 'info':
      return 'info';
    case 'warn':
      return 'warn';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

// Store original console methods before any overrides
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

// Create pino logger only if logging is enabled
let pinoLogger: pino.Logger;

if (loggingEnabled) {
  // Create file transport using pino.transport()
  const transport = pino.transport({
    target: 'pino/file',
    options: {
      destination: logFilePath,
      mkdir: true,
    },
  });

  // Create pino logger with file transport
  pinoLogger = pino(
    {
      level: getPinoLevel(),
    },
    transport
  );

  // Override console methods to route to pino (file only, not stdout/stderr)
  console.log = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.info({ source: 'console.log' }, message);
  };

  console.info = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.info({ source: 'console.info' }, message);
  };

  console.warn = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.warn({ source: 'console.warn' }, message);
  };

  console.error = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.error({ source: 'console.error' }, message);
  };

  console.debug = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    pinoLogger.debug({ source: 'console.debug' }, message);
  };
} else {
  // Create a silent/noop logger when logging is disabled
  pinoLogger = pino({ level: 'silent' });

  // When logging is disabled, make console methods no-ops to avoid MCP protocol issues
  // stdout is reserved for JSON-RPC messages
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  // Keep console.error going to stderr (safe for MCP)
  // console.error remains unchanged
}

class Logger {
  debug(message: string, context?: LogContext) {
    if (!loggingEnabled) return;
    if (context) {
      pinoLogger.debug(context, message);
    } else {
      pinoLogger.debug(message);
    }
  }

  info(message: string, context?: LogContext) {
    if (!loggingEnabled) return;
    if (context) {
      pinoLogger.info(context, message);
    } else {
      pinoLogger.info(message);
    }
  }

  warn(message: string, context?: LogContext) {
    if (!loggingEnabled) return;
    if (context) {
      pinoLogger.warn(context, message);
    } else {
      pinoLogger.warn(message);
    }
  }

  error(message: string, context?: LogContext) {
    if (!loggingEnabled) return;
    if (context) {
      pinoLogger.error(context, message);
    } else {
      pinoLogger.error(message);
    }
  }

  toolCall(toolName: string, success: boolean, duration: number, context?: LogContext) {
    this.info(`Tool ${toolName} ${success ? 'succeeded' : 'failed'}`, {
      tool: toolName,
      success,
      duration: `${duration}ms`,
      ...context
    });
  }

  apiCall(endpoint: string, method: string, status: number, duration: number, rateLimit?: any) {
    this.debug(`API ${method} ${endpoint}`, {
      method,
      endpoint,
      status,
      duration: `${duration}ms`,
      rateLimit
    });
  }
}

export const logger = new Logger();
export const pino_logger = pinoLogger;
export { originalConsole };
export type { LogContext };
