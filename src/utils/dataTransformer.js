export function getSummaryStats(data, mapping) {
    if (!data || !mapping.status) return {};

    const stats = data.reduce((acc, row) => {
        const status = row[mapping.status] || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        acc._total = (acc._total || 0) + 1;
        return acc;
    }, {});

    return stats;
}

export function getChartData(data, mapping, filters = {}) {
    if (!data || !mapping.status) return [];

    const filteredData = data.filter(row => {
        const projectMatch = !filters.project || row[mapping.project] === filters.project;
        const statusMatch = !filters.status || row[mapping.status] === filters.status;
        return projectMatch && statusMatch;
    });

    const counts = filteredData.reduce((acc, row) => {
        const status = row[mapping.status] || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({
        name,
        value
    }));
}

export function getProjectData(data, mapping, filters = {}) {
    if (!data || !mapping.project) return [];

    const filteredData = data.filter(row => {
        // Note: Project chart usually shows distribution across all projects, 
        // but we can respect the status filter if provided.
        const statusMatch = !filters.status || row[mapping.status] === filters.status;
        return statusMatch;
    });

    const counts = filteredData.reduce((acc, row) => {
        const project = row[mapping.project] || 'Unknown';
        acc[project] = (acc[project] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({
        name,
        value
    }));
}

export function getUniqueValues(data, columnName) {
    if (!data || !columnName) return [];
    const values = new Set(data.map(row => row[columnName]).filter(Boolean));
    return Array.from(values).sort();
}

export function getDurationByStatus(data, mapping) {
    if (!data || !mapping.status) return {};

    const durationByStatus = data.reduce((acc, row) => {
        const status = row[mapping.status] || 'Unknown';
        const durationStr = row[mapping.duration] || '0';
        
        // Parse duration in format "MM:SS" or "MM" or numeric minutes
        let minutes = 0;
        if (typeof durationStr === 'number') {
            minutes = durationStr;
        } else if (typeof durationStr === 'string') {
            if (durationStr.includes(':')) {
                // Format: MM:SS
                const parts = durationStr.split(':');
                const mins = parseInt(parts[0], 10) || 0;
                const secs = parseInt(parts[1], 10) || 0;
                minutes = mins + secs / 60;
            } else {
                // Assume numeric string or just minutes
                minutes = parseFloat(durationStr) || 0;
            }
        }
        
        acc[status] = (acc[status] || 0) + minutes;
        return acc;
    }, {});

    // Log the duration calculations
    console.log('⏱️ Duration Column Detected:', mapping.duration);
    console.log('📊 Duration by Status (in minutes):', durationByStatus);
    console.log('📈 Duration by Status Summary:', Object.entries(durationByStatus).map(([status, mins]) => ({
        status,
        minutes: mins.toFixed(2),
        formatted: formatDuration(mins),
        hours: (mins / 60).toFixed(2)
    })));

    return durationByStatus;
}

export function formatDuration(minutes) {
    if (!minutes || minutes === 0) return '0:00';
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationAsHours(minutes) {
    if (!minutes || minutes === 0) return '0 ساعات';
    const hours = (minutes / 60).toFixed(2);
    return `${hours} ساعات`;
}
