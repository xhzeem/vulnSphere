// Utility functions for formatting display labels

export const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
        'DRAFT': 'Draft',
        'IN_REVIEW': 'In Review',
        'FINAL': 'Final',
        'ARCHIVED': 'Archived',
    };
    return statusMap[status] || status;
};

export const formatSeverity = (severity: string): string => {
    const severityMap: Record<string, string> = {
        'CRITICAL': 'Critical',
        'HIGH': 'High',
        'MEDIUM': 'Medium',
        'LOW': 'Low',
        'INFO': 'Info',
    };
    return severityMap[severity] || severity;
};

export const formatVulnerabilityStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
        'OPEN': 'Open',
        'IN_PROGRESS': 'In Progress',
        'RESOLVED': 'Resolved',
        'ACCEPTED_RISK': 'Accepted Risk',
        'FALSE_POSITIVE': 'False Positive',
    };
    return statusMap[status] || status;
};

export const formatAssetType = (type: string): string => {
    const typeMap: Record<string, string> = {
        'server': 'Server',
        'web': 'Web Application',
        'network': 'Network Device',
        'database': 'Database',
        'cloud': 'Cloud Service',
        'WEB_APP': 'Web App',
        'API': 'API',
        'SERVER': 'Server',
        'MOBILE_APP': 'Mobile App',
        'NETWORK_DEVICE': 'Network Device',
        'OTHER': 'Other',
    };
    return typeMap[type] || type;
};

export const formatEngagementType = (type: string): string => {
    const typeMap: Record<string, string> = {
        'BLACK_BOX': 'Black Box',
        'GRAY_BOX': 'Gray Box',
        'WHITE_BOX': 'White Box',
    };
    return typeMap[type] || type;
};

export const formatEnvironment = (env: string): string => {
    const envMap: Record<string, string> = {
        'PRODUCTION': 'Production',
        'STAGING': 'Staging',
        'DEVELOPMENT': 'Development',
        'QA': 'QA',
    };
    return envMap[env] || env;
};
