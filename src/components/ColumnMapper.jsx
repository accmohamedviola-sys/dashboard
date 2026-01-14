import React from 'react';
import { Settings, CheckCircle } from 'lucide-react';

export function ColumnMapper({ columns, mapping, onUpdate, onConfirm }) {
    const handleChange = (field, value) => {
        onUpdate({ ...mapping, [field]: value });
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', zIndex: 100 }}>
            <div className="glass-card w-full p-8 shadow-2xl space-y-6" style={{ maxWidth: '28rem' }}>
                <div className="flex items-center gap-3 border-b pb-4">
                    <Settings className="text-blue-400" size={24} />
                    <h2 className="text-xl font-bold text-white">إعدادات البيانات / Schema Setup</h2>
                </div>

                <p className="text-slate-400 text-sm">
                    أهلاً بك! يرجى تحديد الأعمدة الصحيحة من الملف المرفق لعرض البيانات بشكل صحيح.
                    <br />
                    Please map the columns from your file to the dashboard fields.
                </p>

                <div style={{ display: 'grid', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--accent-teal)', marginBottom: '8px' }}>الحالة / STATUS COLUMN</label>
                        <select
                            value={mapping.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">Choose column...</option>
                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--accent-teal)', marginBottom: '8px' }}>المشروع / PROJECT COLUMN</label>
                        <select
                            value={mapping.project}
                            onChange={(e) => handleChange('project', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">Choose column...</option>
                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--accent-teal)', marginBottom: '8px' }}>المسؤول / ASSIGNEE (OPTIONAL)</label>
                        <select
                            value={mapping.assignee}
                            onChange={(e) => handleChange('assignee', e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <option value="">Choose column...</option>
                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                    </div>
                </div>

                <button
                    onClick={onConfirm}
                    disabled={!mapping.status || !mapping.project}
                    className="btn"
                    style={{ width: '100%', marginTop: '10px' }}
                >
                    <CheckCircle size={20} />
                    حفظ / SAVE CONFIGURATION
                </button>
            </div>
        </div>
    );
}
