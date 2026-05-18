type Request = any;
type Response = any;
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    environment: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    nodejs: {
        version: string;
        platform: string;
        arch: string;
    };
    azure: {
        hostname?: string;
        instanceId?: string;
        siteName?: string;
        resourceGroup?: string;
        applicationInsights: boolean;
        customDomain: string;
    };
    services: {
        trello: {
            status: 'available' | 'unavailable';
            endpoint: string;
        };
        mcp: {
            status: 'active' | 'inactive';
            tools: number;
        };
    };
    performance: {
        cpuUsage: NodeJS.CpuUsage;
        memoryUtilization: number;
        avgResponseTime?: number;
    };
}
export declare class HealthChecker {
    private startTime;
    private requestTimes;
    private readonly maxRequestTimes;
    recordRequestTime(duration: number): void;
    private getAverageResponseTime;
    private checkTrelloAPI;
    private getMemoryUtilization;
    private determineOverallStatus;
    getHealthStatus(): Promise<HealthStatus>;
    handleHealthCheck(req: Request, res: Response): Promise<void>;
}
export declare const healthChecker: HealthChecker;
export {};
//# sourceMappingURL=health.d.ts.map