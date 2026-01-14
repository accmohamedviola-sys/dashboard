import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';

const COLORS = ['#4fd1c5', '#f6ad55', '#2c7a7b', '#b7791f', '#319795', '#d69e2e'];

export function StatusChart({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div className="chart-container" style={{ minHeight: '400px' }}>
            <h3 className="chart-header">
                توزيع وحالة العمل / VOLUMETRIC STATUS
            </h3>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data} margin={{ top: 25, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={14}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={false}
                        tick={{ dy: 10 }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={14}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #ffffff10',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '16px'
                        }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList
                            dataKey="value"
                            position="top"
                            fill="#fff"
                            fontSize={16}
                            fontWeight={800}
                            offset={10}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
