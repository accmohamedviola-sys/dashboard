import { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import localXlsxUrl from '../assets/Book1.xlsx?url';

const COLUMN_MAPPING_KEY = 'dashboard_column_mapping_v2';
const GSHEET_ID_KEY = 'dashboard_gsheet_id';

const WHITELISTED_SHEETS = [
  'مشروع قيم و عبر',
  'MSA PROJECT',
  'DORO PROJECT',
  'NURSERY PROJECT'
];

 function base64UrlEncode(str) {
   const bytes = new TextEncoder().encode(str);
   let binary = '';
   for (let i = 0; i < bytes.length; i += 1) {
     binary += String.fromCharCode(bytes[i]);
   }
   return btoa(binary).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
 }

 function tryDecodeRedeemLink(input) {
   try {
     const url = new URL(input);
     const redeem = url.searchParams.get('redeem');
     if (!redeem) return input;
     const decoded = atob(redeem);
     return decoded && decoded.startsWith('http') ? decoded : input;
   } catch {
     return input;
   }
 }

 function toOneDriveDownloadUrl(input) {
   try {
     const url = new URL(input);
     if (!url.hostname.includes('onedrive.live.com')) return null;
     const resid = url.searchParams.get('resid');
     if (!resid) return null;
     const downloadUrl = new URL('https://onedrive.live.com/download');
     downloadUrl.searchParams.set('resid', resid);
     const authkey = url.searchParams.get('authkey');
     if (authkey) downloadUrl.searchParams.set('authkey', authkey);
     return downloadUrl.toString();
   } catch {
     return null;
   }
 }

 function looksLikeXlsx(arrayBuffer) {
   try {
     const bytes = new Uint8Array(arrayBuffer);
     return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
   } catch {
     return false;
   }
 }

 function extractFirstUrl(input) {
   if (!input) return '';
   const srcMatch = input.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
   if (srcMatch && srcMatch[1]) return srcMatch[1];
   const urlMatch = input.match(/https?:\/\/[^\s"'<>]+/i);
   return urlMatch ? urlMatch[0] : input;
 }

export function useSchema() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [sheets, setSheets] = useState({});
  const [sheetNames, setSheetNames] = useState([]);
  const [currentSheet, setCurrentSheet] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => localStorage.getItem('dashboard_last_updated') || '');

  const [mapping, setMapping] = useState(() => {
    const saved = localStorage.getItem(COLUMN_MAPPING_KEY);
    const defaults = { status: '', project: '', assignee: '' };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [gsheetId, setGsheetId] = useState(() =>
    localStorage.getItem(GSHEET_ID_KEY) || 'https://1drv.ms/x/c/A92782A3D7A10117/IQDoSVrij__2Tqot-EhrcnbYAXe49o7Cm-P9bRqnHm_TAaY?e=l8b8iI'
  );

  const [isConfigured, setIsConfigured] = useState(false);
  const [encoding, setEncoding] = useState('UTF-8');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAutoMapping = useCallback((sheetName) => {
    if (['DORO PROJECT', 'MSA PROJECT', 'مشروع قيم و عبر'].includes(sheetName)) {
      return { status: 'حالة السكربت ', project: 'اسم السكربت', assignee: 'اسم الأنيميتور', duration: 'مدة الصوت' };
    }
    if (sheetName === 'NURSERY PROJECT') {
      return { status: 'حالة الاغنية ', project: 'اسم الاغنية ', assignee: 'الانيميتور', duration: 'مدة الاغنية ' };
    }
    return null;
  }, []);

  const switchSheet = useCallback((name) => {
    if (sheets[name]) {
      const sheetData = sheets[name];
      setData(sheetData);
      setCurrentSheet(name);
      if (sheetData.length > 0) {
        const cols = Object.keys(sheetData[0]);
        setColumns(cols);

        // Auto-map if it matches our projects
        const auto = getAutoMapping(name);
        if (auto && cols.includes(auto.status)) {
          setMapping(auto);
          localStorage.setItem(COLUMN_MAPPING_KEY, JSON.stringify(auto));
        }
      }
    }
  }, [sheets, getAutoMapping]);

  const removeSheet = useCallback((name) => {
    setSheets(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setSheetNames(prev => prev.filter(n => n !== name));
    if (currentSheet === name) {
      setSheetNames(prev => {
        const remaining = prev.filter(n => n !== name);
        if (remaining.length > 0) {
          const nextSheet = remaining[0];
          setCurrentSheet(nextSheet);
          setData(sheets[nextSheet] || []);
          setColumns(sheets[nextSheet] ? Object.keys(sheets[nextSheet][0]) : []);
        } else {
          setCurrentSheet('');
          setData([]);
          setColumns([]);
        }
        return prev;
      });
    }
  }, [currentSheet, sheets]);

  const saveGsheetId = useCallback((id) => {
    setGsheetId(id);
    localStorage.setItem(GSHEET_ID_KEY, id);
  }, []);

  const handleExcelData = useCallback((arrayBuffer, name = 'Remote Sheet') => {
    try {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const newSheets = {};
      let names = workbook.SheetNames;

      // Filter names based on whitelist
      const filteredNames = names.filter(name => WHITELISTED_SHEETS.includes(name));

      // If none of the whitelisted sheets are found, fallback to original names but show a warning
      // Actually, user wants "ONLY these", so we should strictly filter.
      if (filteredNames.length > 0) {
        names = filteredNames;
      }

      if (!names || names.length === 0) {
        throw new Error("لم يتم العثور على الصفحات المطلوبة / Required sheets not found");
      }

      let firstNonEmptySheet = null;
      names.forEach(name => {
        const worksheet = workbook.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        newSheets[name] = jsonData;
        if (!firstNonEmptySheet && jsonData.length > 0) {
          firstNonEmptySheet = name;
        }
      });

      setSheets(newSheets);
      setSheetNames(names);

      const targetSheet = firstNonEmptySheet || names[0];
      setCurrentSheet(targetSheet);

      if (newSheets[targetSheet].length === 0) {
        setError(`جميع الصفحات فارغة / All sheets are empty`);
        setData([]);
        setColumns([]);
      } else {
        setData(newSheets[targetSheet]);
        const cols = Object.keys(newSheets[targetSheet][0]);
        setColumns(cols);

        // Auto-map for the initial sheet
        const auto = getAutoMapping(targetSheet);
        if (auto && cols.includes(auto.status)) {
          setMapping(auto);
          localStorage.setItem(COLUMN_MAPPING_KEY, JSON.stringify(auto));
        }
      }
    } catch (err) {
      console.error('XLSX Error:', err);
      setError(`خطأ في معالجة البيانات: ${err.message}`);
    }
  }, [getAutoMapping]);

  const reloadLocalFile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(localXlsxUrl);
      if (!response.ok) {
        throw new Error(`فشل تحميل الملف المحلي / Failed to load local file. (${response.status} ${response.statusText})`);
      }
      const buffer = await response.arrayBuffer();
      // try to read Last-Modified header from the response, fall back to now
      const lm = response.headers.get('last-modified');
      const dateIso = lm ? new Date(lm).toISOString() : new Date().toISOString();
      setLastUpdated(dateIso);
      localStorage.setItem('dashboard_last_updated', dateIso);
      handleExcelData(buffer, 'Local Data');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [handleExcelData]);

  const syncRemoteFile = useCallback(async (input = gsheetId) => {
    // Google Sheets / remote sync has been disabled and moved to legacy/syncHandlers.js
    // Keep signature for compatibility but do nothing.
    console.warn('[syncRemoteFile] Google Sheets sync is disabled in this build.');
    setError('مزامنة Google Sheets معطلة — يتم استخدام الملف المحلي المرفق.');
  }, [gsheetId, handleExcelData]);

  const syncGoogleSheet = syncRemoteFile;

  const parseFile = useCallback((file, selectedEncoding = 'UTF-8') => {
    // File upload is disabled — use the bundled local Excel file included with the site.
    console.warn('[parseFile] File upload is disabled in this build.');
    setError('رفع الملفات معطل — يتم استخدام الملف المحلي المرفق.');
  }, []);

  const updateMapping = useCallback((newMapping) => {
    setMapping(newMapping);
    localStorage.setItem(COLUMN_MAPPING_KEY, JSON.stringify(newMapping));
  }, []);

  const resetMapping = useCallback(() => {
    localStorage.removeItem(COLUMN_MAPPING_KEY);
    setMapping({ status: '', project: '', assignee: '' });
    setIsConfigured(false);
  }, []);

  useEffect(() => {
    if (data.length === 0) {
      reloadLocalFile();
    }
  }, []);

  useEffect(() => {
    if (mapping.status && mapping.project && columns.length > 0) {
      const isValid = columns.includes(mapping.status) && columns.includes(mapping.project);
      setIsConfigured(isValid);
    } else {
      setIsConfigured(false);
    }
  }, [mapping, columns]);

  return {
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
    reloadLocalFile,
    gsheetId,
    syncGoogleSheet,
    saveGsheetId,
    lastUpdated
  };
}
