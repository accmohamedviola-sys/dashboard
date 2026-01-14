import React from 'react';
import { Filter, X } from 'lucide-react';

export function Filters({ projects, statuses, currentFilters, onFilterChange }) {
    const clearFilters = () => {
        onFilterChange({ project: '', status: '' });
    };

    const hasFilters = currentFilters.project || currentFilters.status;

    return (
        <div className="chart-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', padding: '24px' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--accent-teal)' }}>
                <Filter size={20} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '1rem', fontWeight: 800 }}>تصفية / FILTERS</span>
            </div>

            <select
                value={currentFilters.project}
                onChange={(e) => onFilterChange({ ...currentFilters, project: e.target.value })}
            >
                <option value="">كل المشاريع / ALL PROJECTS</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
                value={currentFilters.status}
                onChange={(e) => onFilterChange({ ...currentFilters, status: e.target.value })}
            >
                <option value="">كل الحالات / ALL STATUSES</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {hasFilters && (
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs"
                    style={{ background: 'none', color: '#fb7185', padding: 0 }}
                >
                    <X size={14} />
                    <span>مسح / Clear</span>
                </button>
            )}
        </div>
    );
}
