import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const COLORS = ['#4fd1c5', '#2c7a7b', '#f6ad55', '#b7791f', '#319795', '#d69e2e', '#48bb78', '#38a169'];

export function ProjectPieChart({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div className="chart-container" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="chart-header">
                توزيع العمل حسب المشاريع
            </h3>
            <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                            style={{ fontSize: '14px', fontWeight: 'bold' }}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #ffffff10',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '16px'
                            }}
                        />
                        <Legend verticalAlign="bottom" height={45} wrapperStyle={{ fontSize: '14px', fontWeight: '600' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
