export const formatJson = (input: string, spaces = 2): string => {
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, spaces);
  } catch (e) {
    return input; // Fallback if invalid
  }
};
