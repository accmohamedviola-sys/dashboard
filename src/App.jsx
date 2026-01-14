import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { useSchema } from './hooks/useSchema';
import { getSummaryStats, getChartData, getProjectData, getUniqueValues } from './utils/dataTransformer';
import { ColumnMapper } from './components/ColumnMapper';
import { StatCard } from './components/StatCard';
import { StatusChart } from './components/StatusChart';
import { ProjectPieChart } from './components/ProjectPieChart';
import { Filters } from './components/Filters';
import {
  Upload,
  LayoutDashboard,
  RefreshCcw,
  PieChart as PieIcon,
  Activity,
  Settings,
  Cpu,
  Search,
  ChevronRight,
  X
} from 'lucide-react';

function App() {
  const {
    data,
    columns,
    mapping,
    isConfigured,
    sheets,
    sheetNames,
    currentSheet,
    isLoading,
    error,
    parseFile,
    switchSheet,
    removeSheet,
    updateMapping,
    resetMapping,
    gsheetId,
    syncGoogleSheet,
    saveGsheetId
  } = useSchema();

  const [filters, setFilters] = useState({ project: '', status: '' });
  const [encoding, setEncoding] = useState('UTF-8');
  const [showSettings, setShowSettings] = useState(false);
  const [tempGsheetId, setTempGsheetId] = useState(gsheetId);
  const [selectedCategory, setSelectedCategory] = useState('_all');

  const stats = useMemo(() => getSummaryStats(data, mapping), [data, mapping]);
  const chartData = useMemo(() => getChartData(data, mapping, filters), [data, mapping, filters]);
  const projectData = useMemo(() => getProjectData(data, mapping, filters), [data, mapping, filters]);
  const projects = useMemo(() => getUniqueValues(data, mapping.project), [data, mapping.project]);
  const statuses = useMemo(() => getUniqueValues(data, mapping.status), [data, mapping.status]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedCategory !== '_all') {
      result = result.filter(row => row[mapping.status] === selectedCategory);
    }
    // Also apply global filters
    if (filters.project) {
      result = result.filter(row => row[mapping.project] === filters.project);
    }
    if (filters.status) {
      result = result.filter(row => row[mapping.status] === filters.status);
    }
    return result;
  }, [data, mapping, selectedCategory, filters]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file, encoding);
  };

  return (
    <div className="strata-container" dir="rtl">
      <div className="noise-overlay"></div>

      {/* Header Statum */}
      <header>
        <div></div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {gsheetId && (
            <button
              onClick={() => syncGoogleSheet()}
              className="btn"
              style={{ background: 'var(--accent-teal)', color: 'var(--bg-deep)' }}
              title="تحديث من جوجل / Sync from Google"
            >
              <RefreshCcw size={18} className={clsx(isLoading && "animate-spin")} />
              <span className="hide-mobile" style={{ marginRight: '8px' }}>تحديث / SYNC</span>
            </button>
          )}

          <button
            onClick={() => {
              setTempGsheetId(gsheetId);
              setShowSettings(!showSettings);
            }}
            className="btn"
            style={{ background: 'var(--silica-white)', color: 'white' }}
          >
            <Settings size={20} />
          </button>

          <div style={{ position: 'relative' }}>
            <select
              value={encoding}
              onChange={(e) => setEncoding(e.target.value)}
              style={{ paddingRight: '40px' }}
            >
              <option value="UTF-8">UTF-8 (Modern)</option>
              <option value="windows-1256">Windows-1256 (Arabic)</option>
            </select>
          </div>

          <label className="btn">
            <Upload size={20} />
            <span className="hide-mobile" style={{ marginRight: '8px' }}>رفع ملف / UPLOAD</span>
            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} className="hidden" />
          </label>

          {data.length > 0 && (
            <button
              onClick={resetMapping}
              className="btn"
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              title="إعادة ضبط / Reset"
            >
              <RefreshCcw size={18} />
            </button>
          )}
        </div>

      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel animate-fade-in">
          <div className="chart-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 className="section-title">إعدادات الربط / SYNC SETTINGS</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              <p className="text-sm text-slate-400">
                أدخل رابط Google Sheet الخاص بك (يجب أن يكون "منشور على الويب"):
              </p>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={tempGsheetId || ''}
                onChange={(e) => setTempGsheetId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-deep)',
                  border: '1px solid var(--silica-border)',
                  padding: '12px',
                  borderRadius: '12px',
                  color: 'white'
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    syncGoogleSheet(tempGsheetId);
                    setShowSettings(false);
                  }}
                >
                  حفظ ومزامنة / SAVE & SYNC
                </button>
                <button
                  className="btn"
                  style={{ background: 'var(--silica-white)', color: 'white' }}
                  onClick={() => setShowSettings(false)}
                >
                  إلغاء / CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Data Stratum */}
      <main style={{ gridColumn: 'auto' }}>
        {error ? (
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
            <Activity size={64} style={{ color: '#f43f5e', marginBottom: '20px', opacity: 0.8 }} />
            <h2 className="text-xl font-black" style={{ color: '#f43f5e' }}>حدث خطأ أثناء معالجة الملف / ERROR</h2>
            <p className="text-slate-400 mt-2">{error}</p>
            <label className="btn" style={{ marginTop: '24px', background: 'rgba(244, 63, 94, 0.1)', borderColor: '#f43f5e', color: '#f43f5e' }}>
              تجربة ملف آخر / TRY ANOTHER FILE
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : isLoading ? (
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div className="animate-spin-slow" style={{ width: '64px', height: '64px', border: '3px dashed var(--accent-teal)', borderRadius: '50%', marginBottom: '20px' }}></div>
            <h2 className="text-xl font-black" style={{ color: 'var(--accent-teal)' }}>جاري معالجة البيانات... / PROCESSING DATA...</h2>
            <p className="text-slate-400">نحن نقوم بتحليل أوراق العمل والمحتوى / Analyzing sheets and structures</p>
          </div>
        ) : data.length === 0 ? (
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', cursor: 'pointer' }}>
            <Cpu size={64} style={{ color: 'var(--accent-teal)', marginBottom: '20px', opacity: 0.5 }} />
            <h2 className="text-3xl font-black">إدخال البيانات مطلوب / INPUT REQUIRED</h2>
            <p className="text-slate-400">يرجى رفع ملف لبدء المعالجة الذكية.</p>
          </div>
        ) : !isConfigured ? (
          <div className="configuration-view">
            {sheetNames.length > 1 && (
              <div className="sheet-selector-overlay animate-fade-in" style={{ marginBottom: '24px' }}>
                <p className="text-sm text-slate-400 mb-2">اختر الصفحة لتحليل بياناتها / Select sheet to analyze:</p>
                <div className="sheet-tabs-container">
                  {sheetNames.map(name => (
                    <div key={name} className="relative group">
                      <button
                        className={clsx("sheet-tab", currentSheet === name && "active")}
                        onClick={() => switchSheet(name)}
                        style={{ paddingRight: '36px' }}
                      >
                        {name}
                        {sheets[name]?.length === 0 && <span style={{ marginRight: '8px', opacity: 0.5 }}>(فارغة)</span>}
                      </button>
                      <button
                        className="sheet-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSheet(name);
                        }}
                        title="حذف / Delete"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ColumnMapper
              columns={columns}
              mapping={mapping}
              onUpdate={updateMapping}
              onConfirm={() => { }}
            />
          </div>
        ) : (
          <>
            <Filters
              projects={projects}
              statuses={statuses}
              currentFilters={filters}
              onFilterChange={setFilters}
            />

            {sheetNames.length > 1 && (
              <div className="sheet-selector animate-fade-in" style={{ margin: '24px 0' }}>
                {sheetNames.map(name => (
                  <button
                    key={name}
                    className={clsx("sheet-tab", currentSheet === name && "active")}
                    onClick={() => switchSheet(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div className="hero-stats">
              <StatCard
                label="كل المهام / ALL ITEMS"
                value={stats._total}
                active={selectedCategory === '_all'}
                onClick={() => setSelectedCategory('_all')}
              />
              {Object.entries(stats)
                .filter(([key]) => key !== '_total')
                .map(([name, count]) => (
                  <StatCard
                    key={name}
                    label={name}
                    value={count}
                    color="orange"
                    active={selectedCategory === name}
                    onClick={() => setSelectedCategory(name)}
                  />
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }} className="animate-fade-in">
              <StatusChart data={chartData} />
              <ProjectPieChart data={projectData} />
            </div>

            <div className="chart-container animate-fade-in" key={selectedCategory}>
              <h3 className="chart-header">
                {selectedCategory === '_all' ? 'بيانات شاملة / GLOBAL DATA' : `${selectedCategory} / DETAILED VIEW`}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>المشروع / PROJECT</th>
                      <th>الحالة / STATUS</th>
                      {mapping.assignee && <th>المسؤول / SOURCE</th>}
                      <th style={{ textAlign: 'center' }}>نسبة الإنجاز / HEALTH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: 'white' }}>{row[mapping.project]}</td>
                        <td>
                          <span style={{ color: 'var(--accent-teal)' }}>{row[mapping.status]}</span>
                        </td>
                        {mapping.assignee && <td style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{row[mapping.assignee]}</td>}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', display: 'inline-block', overflow: 'hidden' }}>
                            <div style={{ width: (row[mapping.status] === 'مكتمل' || row[mapping.status] === 'Done') ? '100%' : '30%', height: '100%', background: 'var(--accent-teal)' }}></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length > 50 && (
                  <p className="text-center text-slate-500 mt-4 text-sm">يتم عرض أول 50 نتيجة فقط / Showing first 50 results only</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
