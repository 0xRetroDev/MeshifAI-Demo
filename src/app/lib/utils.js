/**
 * Combines multiple class names into a single string
 * @param {string[]} classes - Class names to combine
 * @returns {string} Combined class names
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
  }
  
  /**
   * Formats a file size in bytes to a human-readable string
   * @param {number} bytes - File size in bytes
   * @param {number} [decimals=2] - Number of decimal places
   * @returns {string} Formatted file size
   */
  export function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
  
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
    const i = Math.floor(Math.log(bytes) / Math.log(k));
  
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  /**
   * Creates a delay using Promise
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   */
  export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }