import { jsonrepair } from 'jsonrepair';
import yaml from 'js-yaml';
import JsonToTS from 'json-to-ts';
import Papa from 'papaparse';

export interface JsonStats {
  sizeKB: string;
  keysCount: number;
  maxDepth: number;
}

// Safely format or repair JSON
export const formatOrRepairJson = (input: string, space = 2): { result: string; fixed: boolean; error: string | null } => {
  if (!input.trim()) return { result: '', fixed: false, error: null };

  try {
    // Attempt standard parse first for valid JSON
    const parsed = JSON.parse(input);
    return { result: JSON.stringify(parsed, null, space), fixed: false, error: null };
  } catch (initialErr: any) {
    try {
      // Attempt repair (handles single quotes, trailing commas, None->null, True->true, etc.)
      const repaired = jsonrepair(input);
      const parsed = JSON.parse(repaired);
      return { result: JSON.stringify(parsed, null, space), fixed: true, error: null };
    } catch (repairErr: any) {
      return { result: input, fixed: false, error: repairErr.message || 'Irreparable syntax error' };
    }
  }
};

// Converters
export const extractObjectArray = (data: any): any[] | null => {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    // If it's an object containing an array, try finding the first array
    for (const key in data) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return null;
};

export const convertToYaml = (jsonStr: string): string => {
  const parsed = JSON.parse(jsonrepair(jsonStr));
  return yaml.dump(parsed);
};

export const convertToCsv = (jsonStr: string): string => {
  const parsed = JSON.parse(jsonrepair(jsonStr));
  const arrayData = extractObjectArray(parsed);
  if (!arrayData) throw new Error('Data must be an array of objects to convert to CSV');
  return Papa.unparse(arrayData);
};

export const convertToTS = (jsonStr: string): string => {
  const parsed = JSON.parse(jsonrepair(jsonStr));
  const interfaces = JsonToTS(parsed, { rootName: 'RootObject' });
  return interfaces.join('\n\n');
};

// Calculate Stats: DFS size, keys, depth
export const getJsonStats = (jsonStr: string): JsonStats => {
  try {
    const parsed = JSON.parse(jsonrepair(jsonStr));
    const sizeKB = (new Blob([jsonStr]).size / 1024).toFixed(1);
    
    let keysCount = 0;
    const calculateDepth = (obj: any, currentDepth: number): number => {
      if (!obj || typeof obj !== 'object') return currentDepth;
      
      let maxD = currentDepth;
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (!Array.isArray(obj)) keysCount++;
          const childDepth = calculateDepth(obj[key], currentDepth + 1);
          if (childDepth > maxD) maxD = childDepth;
        }
      }
      return maxD;
    };
    
    const maxDepth = calculateDepth(parsed, 0);
    return { sizeKB, keysCount, maxDepth };
  } catch (e) {
    return { sizeKB: '0', keysCount: 0, maxDepth: 0 };
  }
};
