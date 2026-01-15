import React from 'react';
import { TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export function StatCard({ label, value, color = 'blue', onClick, active }) {
    const colorMap = {
        blue: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
        green: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
        orange: 'from-orange-500/20 to-orange-600/5 text-orange-400 border-orange-500/20',
        purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
        rose: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/20',
    };

    const themeClass = colorMap[color] || colorMap.blue;

    return (
        <div
            className={clsx("stat-card animate-fade-in", active && "active")}
            onClick={onClick}
            style={{
                borderLeftColor: color === 'orange' ? 'var(--accent-amber)' : 'var(--accent-teal)',
                cursor: 'pointer'
            }}
        >
            <div className="stat-value">{value}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', color: color === 'orange' ? 'var(--accent-amber)' : 'var(--accent-teal)', fontSize: '1.15rem', fontWeight: 700, marginTop: '6px' }}>
                {label.includes('ALL') ? `عدد السكربتات: ${value}` : label}
            </div>
        </div>
    );
}
