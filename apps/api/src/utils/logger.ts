type LogContext = Record<string, unknown>;

function write(level: 'info' | 'error', message: string, context: LogContext = {}): void {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else console.log(output);
}

export const logger = {
  info: (message: string, context?: LogContext) => write('info', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
