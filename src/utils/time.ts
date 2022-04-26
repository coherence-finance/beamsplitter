/**
 * Get the current epoch timestamp in seconds with microsecond precision
 */
export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};
