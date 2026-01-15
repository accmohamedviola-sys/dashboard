// Legacy sync and upload handlers (moved out of main hook)
// These implementations are kept here for reference but are not imported/used by the app by default.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import localXlsxUrl from '../assets/Book1.xlsx?url';

const WHITELISTED_SHEETS = [
  'مشروع قيم و تغير',
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

export async function legacyReloadLocalFile(handleExcelData, setIsLoading, setError) {
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch(localXlsxUrl);
    if (!response.ok) {
      throw new Error(`فشل تحميل الملف المحلي / Failed to load local file. (${response.status} ${response.statusText})`);
    }
    const buffer = await response.arrayBuffer();
    handleExcelData(buffer, 'Local Data');
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
}

export function legacyParseFile(file, handleExcelData, setIsLoading, setError, selectedEncoding = 'UTF-8') {
  setIsLoading(true);
  setError(null);
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleExcelData(e.target.result, file.name);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError("خطأ في قراءة الملف / File read error");
      setIsLoading(false);
    };
    reader.readAsArrayBuffer(file);
  } else {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: selectedEncoding,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const csvData = results.data;
          // consumer should set data/state accordingly
        }
        setIsLoading(false);
      },
      error: (error) => {
        console.error('Parsing error:', error);
        setError("خطأ في تحليل ملف CSV");
        setIsLoading(false);
      }
    });
  }
}

export async function legacySyncRemoteFile(input, handleExcelData, setIsLoading, setError) {
  if (!input) return;
  setIsLoading(true);
  setError(null);
  try {
    let url = '';

    const trimmedInput = input.trim();
    if (!/^https?:\/\//i.test(trimmedInput)) {
      throw new Error('الرابط غير صالح. يجب أن يبدأ بـ http:// أو https:// / Invalid URL. Must start with http:// or https://');
    }
    const directDownload = toOneDriveDownloadUrl(trimmedInput);

    if (directDownload) {
      url = directDownload;
    } else if (trimmedInput.includes('1drv.ms') || trimmedInput.includes('onedrive.live.com')) {
      const resolvedLink = tryDecodeRedeemLink(trimmedInput);
      const base64 = base64UrlEncode(resolvedLink);
      url = `https://api.onedrive.com/v1.0/shares/u!${base64}/root/content`;
    } else if (trimmedInput.includes('google.com')) {
      const cleanId = trimmedInput.includes('/d/') ? trimmedInput.split('/d/')[1].split('/')[0] : trimmedInput;
      url = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=xlsx`;
    } else {
      url = trimmedInput;
    }

    let response = await fetch(url);
    if (!response.ok) {
      throw new Error(`فشل الوصول للملف. تأكد أن الرابط عام (Public) / Access failed. Ensure the link is public. (${response.status} ${response.statusText})`);
    }

    let buffer = await response.arrayBuffer();
    if (!looksLikeXlsx(buffer)) {
      const fallback = toOneDriveDownloadUrl(response.url) || toOneDriveDownloadUrl(trimmedInput);
      if (fallback && fallback !== url) {
        response = await fetch(fallback);
        if (!response.ok) {
          throw new Error(`فشل الوصول للملف. تأكد أن الرابط عام (Public) / Access failed. Ensure the link is public. (${response.status} ${response.statusText})`);
        }
        buffer = await response.arrayBuffer();
      }
    }

    if (!looksLikeXlsx(buffer)) {
      throw new Error('Provided link leads to a web page, not a file');
    }

    handleExcelData(buffer, 'Remote Data');

  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
}
