interface TelemetryData {
    [key: string]: any;
}
declare class ApplicationInsights {
    private isEnabled;
    initialize(): void;
    trackEvent(_name: string, _properties?: TelemetryData, _measurements?: TelemetryData): void;
    trackRequest(_name: string, _url: string, _duration: number, _resultCode: string | number, _success: boolean, _properties?: TelemetryData): void;
    trackDependency(_dependencyTypeName: string, _name: string, _data: string, _duration: number, _success: boolean, _resultCode?: string, _properties?: TelemetryData): void;
    trackException(exception: Error, _properties?: TelemetryData): void;
    trackMetric(_name: string, _value: number, _properties?: TelemetryData): void;
    trackTrace(_message: string, _severity?: number, _properties?: TelemetryData): void;
    flush(): void;
}
export declare const insights: ApplicationInsights;
export type { TelemetryData };
//# sourceMappingURL=appInsights.d.ts.map