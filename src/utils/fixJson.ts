import { jsonrepair } from 'jsonrepair';

export interface FixResult {
  repaired: string;
  isFixed: boolean;
  error: string | null;
  line: number | null;
  col: number | null;
}

export const fixJson = (input: string): FixResult => {
  if (!input.trim()) return { repaired: '', isFixed: false, error: null, line: null, col: null };

  // Explicit unescaping algorithm for deeply stringified API payloads
  let processedInput = input.trim();
  if (
    (processedInput.startsWith('"') && processedInput.endsWith('"')) ||
    (processedInput.startsWith("'") && processedInput.endsWith("'"))
  ) {
    try {
      const unescaped = JSON.parse(processedInput);
      if (typeof unescaped === 'string') processedInput = unescaped;
    } catch {
      processedInput = processedInput.replace(/^['"](.*)['"]$/, '$1').replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
  }

  try {
    // Attempt standard parse first
    JSON.parse(processedInput);
    return { repaired: processedInput, isFixed: false, error: null, line: null, col: null };
  } catch (e) {
    // If standard fails, try jsonrepair
    try {
      const repaired = jsonrepair(processedInput);
      // Validate the repair worked
      JSON.parse(repaired);
      return { repaired, isFixed: true, error: null, line: null, col: null };
    } catch (err: any) {
      
      // If jsonrepair ALSO fails, try extracting a JSON payload out of a noisy log string!
      try {
        const logMatch = processedInput.match(/([\{\[].*[\}\]])/s);
        if (logMatch && logMatch[1]) {
          const extracted = logMatch[1];
          const repairedExtract = jsonrepair(extracted);
          JSON.parse(repairedExtract); // Validate
          return { repaired: repairedExtract, isFixed: true, error: null, line: null, col: null };
        }
      } catch (extractErr) {
        // Allow fallback to exact error message below
      }

      // Extract exact line/col from jsonrepair error
      const msg = err.message || 'Irreparable syntax error';
      const match = msg.match(/line (\d+), column (\d+)/);
      return { 
        repaired: input, 
        isFixed: false, 
        error: msg.split('\n')[0], 
        line: match ? parseInt(match[1], 10) : null, 
        col: match ? parseInt(match[2], 10) : null 
      };
    }
  }
};
