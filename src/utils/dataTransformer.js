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
