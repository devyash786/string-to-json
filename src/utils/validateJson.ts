export const validateJson = (input: string): { isValid: boolean; error: string | null } => {
  if (!input.trim()) return { isValid: true, error: null };
  try {
    JSON.parse(input);
    return { isValid: true, error: null };
  } catch (err: any) {
    return { isValid: false, error: err.message };
  }
};
