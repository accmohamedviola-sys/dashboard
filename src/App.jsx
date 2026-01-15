import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { useSchema } from './hooks/useSchema';
import { getSummaryStats, getChartData, getProjectData, getUniqueValues } from './utils/dataTransformer';
import { ColumnMapper } from './components/ColumnMapper';
import { StatCard } from './components/StatCard';
import { StatusChart } from './components/StatusChart';
import { ProjectPieChart } from './components/ProjectPieChart';
import {
  Upload,
  LayoutDashboard,
  PieChart as PieIcon,
  Activity,
  Settings,
  Cpu,
  Search,
  ChevronRight,
  X
} from 'lucide-react';

const DASHBOARD_SETTINGS_KEY = 'dashboard_view_settings_v1';

function loadDashboardSettings() {
  try {
    const raw = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (!raw) {
      return {
        uiMode: 'admin',
        enabledSheets: [],
        defaultSheet: '',
        lockSheetSelection: false,
        perSheetFilters: {},
        perSheetMappings: {}
      };
    }
    const parsed = JSON.parse(raw);
    return {
      uiMode: parsed?.uiMode === 'viewer' ? 'viewer' : 'admin',
      enabledSheets: Array.isArray(parsed?.enabledSheets) ? parsed.enabledSheets : [],
      defaultSheet: typeof parsed?.defaultSheet === 'string' ? parsed.defaultSheet : '',
      lockSheetSelection: Boolean(parsed?.lockSheetSelection),
      perSheetFilters: parsed?.perSheetFilters && typeof parsed?.perSheetFilters === 'object' ? parsed.perSheetFilters : {},
      perSheetMappings: parsed?.perSheetMappings && typeof parsed?.perSheetMappings === 'object' ? parsed.perSheetMappings : {}
    };
  } catch {
    return {
      uiMode: 'admin',
      enabledSheets: [],
      defaultSheet: '',
      lockSheetSelection: false,
      perSheetFilters: {},
      perSheetMappings: {}
    };
  }
}

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
    saveGsheetId,
    reloadLocalFile
    ,
    lastUpdated
  } = useSchema();

  const isAdminParam = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('admin') === '1';
    } catch {
      return false;
    }
  }, []);

  const [dashboardSettings, setDashboardSettings] = useState(() => loadDashboardSettings());
  const [tempDashboardSettings, setTempDashboardSettings] = useState(dashboardSettings);
  const dashboardSettingsRef = useRef(dashboardSettings);
  useEffect(() => {
    dashboardSettingsRef.current = dashboardSettings;
  }, [dashboardSettings]);

  const updateDashboardSettings = useCallback((updater) => {
    setDashboardSettings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
      } catch {
        if (next === prev) return prev;
      }
      localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const showAdminControls = isAdminParam || dashboardSettings.uiMode === 'admin';

  const visibleSheetNames = useMemo(() => {
    if (!sheetNames || sheetNames.length === 0) return [];
    const enabled = dashboardSettings.enabledSheets;
    if (!enabled || enabled.length === 0) return sheetNames;
    return sheetNames.filter((n) => enabled.includes(n));
  }, [sheetNames, dashboardSettings.enabledSheets]);

  const [filters, setFilters] = useState({ project: '', status: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [tempGsheetId, setTempGsheetId] = useState(gsheetId);
  const [selectedCategory, setSelectedCategory] = useState('_all');
  const [settingsSheet, setSettingsSheet] = useState('');
  const [showSchemaSetup, setShowSchemaSetup] = useState(false);

  const stats = useMemo(() => getSummaryStats(data, mapping), [data, mapping]);
  const chartData = useMemo(() => getChartData(data, mapping, filters), [data, mapping, filters]);
  const projectData = useMemo(() => getProjectData(data, mapping, filters), [data, mapping, filters]);
  const projects = useMemo(() => getUniqueValues(data, mapping.project), [data, mapping.project]);
  const statuses = useMemo(() => getUniqueValues(data, mapping.status), [data, mapping.status]);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return '';
    try {
      const d = new Date(lastUpdated);
      return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
    } catch {
      return lastUpdated;
    }
  }, [lastUpdated]);

  useEffect(() => {
    if (!showSettings) return;
    if (settingsSheet) return;
    if (currentSheet) setSettingsSheet(currentSheet);
    else if (visibleSheetNames.length > 0) setSettingsSheet(visibleSheetNames[0]);
  }, [showSettings, settingsSheet, currentSheet, visibleSheetNames]);

  useEffect(() => {
    if (!currentSheet) return;
    if (visibleSheetNames.length === 0) return;
    if (visibleSheetNames.includes(currentSheet)) return;

    const preferred = dashboardSettingsRef.current.defaultSheet;
    const next = (preferred && visibleSheetNames.includes(preferred)) ? preferred : visibleSheetNames[0];
    if (next) switchSheet(next);
  }, [currentSheet, visibleSheetNames, switchSheet]);

  useEffect(() => {
    if (!currentSheet) return;
    const saved = dashboardSettingsRef.current?.perSheetFilters?.[currentSheet];
    if (!saved) return;
    const nextFilters = saved.filters || { project: '', status: '' };
    const nextCategory = typeof saved.category === 'string' ? saved.category : '_all';

    setFilters((prev) => (JSON.stringify(prev) === JSON.stringify(nextFilters) ? prev : nextFilters));
    setSelectedCategory((prev) => (prev === nextCategory ? prev : nextCategory));
  }, [currentSheet]);

  // Persist provided default schema mappings for known project sheets
  useEffect(() => {
    if (!sheetNames || sheetNames.length === 0) return;
    const DEFAULT_MAPPINGS = {
      'NURSERY PROJECT': { status: 'حالة الاغنية ', project: 'اسم الاغنية ', assignee: 'الانيميتور' },
      'DORO PROJECT': { status: 'حالة السكربت ', project: 'اسم السكربت', assignee: 'اسم الأنيميتور' },
      'MSA PROJECT': { status: 'حالة السكربت', project: 'اسم السكربت', assignee: 'اسم الأنيميتور' },
      'مشروع قيم و تغير': { status: 'حالة السكربت ', project: 'اسم السكربت', assignee: 'اسم الأنيميتور' },
      'مشروع قيم و عبر': { status: 'حالة السكربت ', project: 'اسم السكربت', assignee: 'اسم الأنيميتور' }
    };

    updateDashboardSettings((prev) => {
      const existing = prev.perSheetMappings || {};
      let changed = false;
      const next = { ...existing };
      Object.entries(DEFAULT_MAPPINGS).forEach(([name, map]) => {
        if (!sheetNames.includes(name)) return;
        if (!next[name] || JSON.stringify(next[name]) !== JSON.stringify(map)) {
          next[name] = map;
          changed = true;
        }
      });
      if (!changed) return prev;
      return { ...prev, perSheetMappings: next };
    });
  }, [sheetNames, updateDashboardSettings]);

  // Auto-apply per-sheet mapping when currentSheet changes (use useRef to avoid circular dependency)
  const lastAppliedSheetRef = useRef('');
  useEffect(() => {
    if (!currentSheet) return;
    if (lastAppliedSheetRef.current === currentSheet) return;
    
    const perMap = dashboardSettings?.perSheetMappings?.[currentSheet];
    if (!perMap) return;
    
    lastAppliedSheetRef.current = currentSheet;
    updateMapping(perMap);
  }, [currentSheet, dashboardSettings?.perSheetMappings, updateMapping]);

  useEffect(() => {
    if (!currentSheet) return;
    updateDashboardSettings((prev) => {
      const prevEntry = prev.perSheetFilters?.[currentSheet] || {};
      const nextEntry = { ...prevEntry, filters, category: selectedCategory };
      if (JSON.stringify(prevEntry) === JSON.stringify(nextEntry)) return prev;
      return {
        ...prev,
        perSheetFilters: {
          ...(prev.perSheetFilters || {}),
          [currentSheet]: nextEntry
        }
      };
    });
  }, [filters, selectedCategory, currentSheet, updateDashboardSettings]);

  const getSheetProjects = useCallback((name) => {
    if (!name) return [];
    if (!mapping.project) return [];
    const rows = sheets?.[name] || [];
    return getUniqueValues(rows, mapping.project);
  }, [sheets, mapping.project]);

  const getSheetStatuses = useCallback((name) => {
    if (!name) return [];
    if (!mapping.status) return [];
    const rows = sheets?.[name] || [];
    return getUniqueValues(rows, mapping.status);
  }, [sheets, mapping.status]);

  // import/export removed

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

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
    if (!currentSheet) return;
    updateDashboardSettings((prev) => {
      const prevEntry = prev.perSheetFilters?.[currentSheet] || {};
      const nextEntry = { ...prevEntry, filters: nextFilters, category: selectedCategory };
      if (JSON.stringify(prevEntry) === JSON.stringify(nextEntry)) return prev;
      return {
        ...prev,
        perSheetFilters: {
          ...(prev.perSheetFilters || {}),
          [currentSheet]: nextEntry
        }
      };
    });
  };

  // File upload handler removed because uploads are disabled in this build.

  return (
    <div className="strata-container" dir="rtl">
      <div className="noise-overlay"></div>

      {/* Header Statum */}
      <header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {formattedLastUpdated ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>الداتا آخر تحديث يوم {formattedLastUpdated}</div>
          ) : (
            <div style={{ height: '18px' }}></div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          

          {showAdminControls && (
            <>
              <button
                onClick={() => {
                  setTempGsheetId(gsheetId);
                  setTempDashboardSettings(dashboardSettings);
                  setShowSettings(!showSettings);
                }}
                className="btn"
                style={{ background: 'var(--silica-white)', color: 'white' }}
              >
                <Settings size={20} />
              </button>

              

              
            </>
          )}

          {/* Reset button removed */}
        </div>

      </header>

      {/* Settings Panel */}
      {showAdminControls && showSettings && (
        <div className="settings-panel animate-fade-in">
          <div className="chart-container">
            <h3 className="section-title">إعدادات الربط / SYNC SETTINGS</h3>
            
            <div className="settings-group">
              <p className="text-sm text-slate-400" style={{ marginBottom: '12px' }}>
                رفع الملفات وموصل Google Sheets معطّلان في هذا الإصدار. يتم استخدام ملف Excel المضمّن مع الموقع.
              </p>
            </div>

            <div className="settings-group">
              <div className="settings-subtitle">إعدادات المخطط مرة واحدة</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>اضغط الزر لفتح إعداد المخطط وحفظه لمرة واحدة.</p>
              <div style={{ marginTop: '10px' }}>
                <button className="btn" onClick={() => setShowSchemaSetup(true)}>إعداد المخطط / Configure Schema</button>
              </div>
            </div>

            <h3 className="section-title">إعدادات العرض / VIEW SETTINGS</h3>

            {/* View Settings Group */}
            <div className="settings-group">
              <div className="settings-row">
                <label className="text-sm text-slate-400">وضع العرض</label>
                <select
                  value={tempDashboardSettings?.uiMode}
                  onChange={(e) => setTempDashboardSettings((prev) => ({ ...prev, uiMode: e.target.value === 'viewer' ? 'viewer' : 'admin' }))}
                >
                  <option value="admin">Admin (إظهار الإعدادات)</option>
                  <option value="viewer">Viewer (رسوم فقط)</option>
                </select>
              </div>

              <div className="settings-row">
                <label className="text-sm text-slate-400">قفل تغيير المصدر</label>
                <input
                  type="checkbox"
                  checked={tempDashboardSettings?.lockSheetSelection}
                  onChange={(e) => setTempDashboardSettings((prev) => ({ ...prev, lockSheetSelection: e.target.checked }))}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-teal)' }}
                />
              </div>

              <div className="settings-row">
                <label className="text-sm text-slate-400">المصدر الافتراضي</label>
                <select
                  value={tempDashboardSettings?.defaultSheet || ''}
                  onChange={(e) => setTempDashboardSettings((prev) => ({ ...prev, defaultSheet: e.target.value }))}
                >
                  <option value="">(أول مصدر متاح)</option>
                  {sheetNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sheets Visibility Group */}
            <div className="settings-group">
              <div className="settings-subtitle">المصادر التي تظهر للمستخدم (Sheet Names)</div>
              <div className="settings-grid">
                {sheetNames.map((n) => {
                  const enabled = (tempDashboardSettings?.enabledSheets?.length === 0) || (tempDashboardSettings?.enabledSheets || []).includes(n);
                  return (
                    <label key={n} className="settings-checkbox-item">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          setTempDashboardSettings((prev) => {
                            const current = Array.isArray(prev?.enabledSheets) ? prev.enabledSheets : [];
                            const currentEffectiveAll = current.length === 0;
                            const base = currentEffectiveAll ? sheetNames : current;
                            const nextSet = new Set(base);
                            if (e.target.checked) nextSet.add(n);
                            else nextSet.delete(n);
                            return { ...prev, enabledSheets: Array.from(nextSet) };
                          });
                        }}
                      />
                      <span>{n}</span>
                    </label>
                  );
                })}
              </div>

              <div className="settings-btn-group">
                <button
                  className="btn"
                  onClick={() => setTempDashboardSettings((prev) => ({ ...prev, enabledSheets: sheetNames }))}
                >
                  تحديد الكل
                </button>
                <button
                  className="btn"
                  onClick={() => setTempDashboardSettings((prev) => ({ ...prev, enabledSheets: [] }))}
                  style={{ background: 'var(--silica-white)', color: 'white' }}
                >
                  إظهار الكل (افتراضي)
                </button>
              </div>
            </div>

            {/* Per-Sheet Filters Group */}
            <div className="settings-group">
              <div className="settings-subtitle">فلتر لكل مصدر</div>
              <select
                value={settingsSheet || ''}
                onChange={(e) => setSettingsSheet(e.target.value)}
              >
                <option value="">(اختر مصدر)</option>
                {sheetNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              {settingsSheet && (
                <>
                  <select
                    value={tempDashboardSettings?.perSheetFilters?.[settingsSheet]?.category || '_all'}
                    onChange={(e) => setTempDashboardSettings((prev) => ({
                      ...prev,
                      perSheetFilters: {
                        ...(prev.perSheetFilters || {}),
                        [settingsSheet]: {
                          ...(prev.perSheetFilters?.[settingsSheet] || {}),
                          category: e.target.value
                        }
                      }
                    }))}
                  >
                    <option value="_all">كل الحالات</option>
                    {getSheetStatuses(settingsSheet).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <select
                    value={tempDashboardSettings?.perSheetFilters?.[settingsSheet]?.filters?.project || ''}
                    onChange={(e) => setTempDashboardSettings((prev) => ({
                      ...prev,
                      perSheetFilters: {
                        ...(prev.perSheetFilters || {}),
                        [settingsSheet]: {
                          ...(prev.perSheetFilters?.[settingsSheet] || {}),
                          filters: {
                            project: e.target.value,
                            status: prev.perSheetFilters?.[settingsSheet]?.filters?.status || ''
                          }
                        }
                      }
                    }))}
                  >
                    <option value="">(بدون فلتر مشروع)</option>
                    {getSheetProjects(settingsSheet).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  <select
                    value={tempDashboardSettings?.perSheetFilters?.[settingsSheet]?.filters?.status || ''}
                    onChange={(e) => setTempDashboardSettings((prev) => ({
                      ...prev,
                      perSheetFilters: {
                        ...(prev.perSheetFilters || {}),
                        [settingsSheet]: {
                          ...(prev.perSheetFilters?.[settingsSheet] || {}),
                          filters: {
                            project: prev.perSheetFilters?.[settingsSheet]?.filters?.project || '',
                            status: e.target.value
                          }
                        }
                      }
                    }))}
                  >
                    <option value="">(بدون فلتر حالة)</option>
                    {getSheetStatuses(settingsSheet).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      onClick={() => {
                        const sheet = settingsSheet;
                        // persist mapping for this sheet and make it default immediately
                        updateDashboardSettings((prev) => {
                          const next = {
                            ...prev,
                            defaultSheet: sheet,
                            perSheetMappings: {
                              ...(prev.perSheetMappings || {}),
                              [sheet]: mapping
                            }
                          };
                          return next;
                        });
                        // apply mapping now
                        updateMapping(mapping);
                        if (visibleSheetNames.includes(sheet)) switchSheet(sheet);
                      }}
                    >
                      حفظ التعيين وجعله افتراضي
                    </button>
                  </div>
                </>
              )}
            </div>

            {showSchemaSetup && (
              <ColumnMapper
                columns={columns}
                mapping={mapping}
                onUpdate={updateMapping}
                onConfirm={() => {
                  updateMapping(mapping);
                  setShowSchemaSetup(false);
                }}
              />
            )}
            {/* Import/Export removed per request */}
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
            <div className="text-center" style={{ marginTop: '24px' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>رفع الملفات معطل — يتم استخدام الملف المحلي المضمّن.</span>
            </div>
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
        ) : (
          <>
            {/* Top filters panel removed per user request */}

            {visibleSheetNames.length > 1 && !dashboardSettings.lockSheetSelection && (
              <div className="sheet-selector animate-fade-in" style={{ margin: '24px 0' }}>
                {visibleSheetNames.map(name => (
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

            {showAdminControls && (
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
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
