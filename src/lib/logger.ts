type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function writeLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  };

  process.stderr.write(`${JSON.stringify(logEntry)}\n`);
}

export function logDebug(event: string, fields?: LogFields) {
  writeLog("debug", event, fields);
}

export function logInfo(event: string, fields?: LogFields) {
  writeLog("info", event, fields);
}

export function logWarn(event: string, fields?: LogFields) {
  writeLog("warn", event, fields);
}

export function logError(event: string, fields?: LogFields) {
  writeLog("error", event, fields);
}
