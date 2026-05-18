import pino from 'pino';
interface LogContext {
    [key: string]: any;
}
declare const originalConsole: {
    log: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    info: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    warn: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    error: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    debug: {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
};
declare class Logger {
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    toolCall(toolName: string, success: boolean, duration: number, context?: LogContext): void;
    apiCall(endpoint: string, method: string, status: number, duration: number, rateLimit?: any): void;
}
export declare const logger: Logger;
export declare const pino_logger: pino.Logger<never, boolean>;
export { originalConsole };
export type { LogContext };
//# sourceMappingURL=logger.d.ts.map