class ApplicationInsights {
    isEnabled = false;
    initialize() {
        // Check if Application Insights is configured
        const instrumentationKey = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
            process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
        if (instrumentationKey) {
            try {
                // Try to load Application Insights if available
                const appInsights = require('applicationinsights');
                appInsights.setup(instrumentationKey).start();
                this.isEnabled = true;
                console.log('✅ Application Insights initialized');
            }
            catch (error) {
                console.warn('Application Insights not available, using no-op implementation');
            }
        }
        else {
            console.warn('Application Insights not configured - telemetry disabled');
        }
    }
    trackEvent(_name, _properties, _measurements) {
        if (!this.isEnabled)
            return;
        // No-op implementation - could be extended with actual tracking
    }
    trackRequest(_name, _url, _duration, _resultCode, _success, _properties) {
        if (!this.isEnabled)
            return;
        // No-op implementation
    }
    trackDependency(_dependencyTypeName, _name, _data, _duration, _success, _resultCode, _properties) {
        if (!this.isEnabled)
            return;
        // No-op implementation
    }
    trackException(exception, _properties) {
        if (!this.isEnabled)
            return;
        // No-op implementation - could log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Exception tracked:', exception.message);
        }
    }
    trackMetric(_name, _value, _properties) {
        if (!this.isEnabled)
            return;
        // No-op implementation
    }
    trackTrace(_message, _severity, _properties) {
        if (!this.isEnabled)
            return;
        // No-op implementation
    }
    flush() {
        if (!this.isEnabled)
            return;
        // No-op implementation
    }
}
export const insights = new ApplicationInsights();
//# sourceMappingURL=appInsights.js.map