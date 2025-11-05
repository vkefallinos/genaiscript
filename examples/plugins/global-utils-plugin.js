/**
 * Global Utilities Plugin Example
 * 
 * Demonstrates how to extend the global context with utility functions
 * that are available throughout script execution
 * 
 * To use this plugin, add it to your genaiscript.config.json:
 * {
 *   "plugins": ["./examples/plugins/global-utils-plugin.js"]
 * }
 */

export default {
    name: "global-utils-plugin",

    setup(extend, options) {
        const trace = options?.trace

        extend((context) => {
            if (!context.global) context.global = {}
            /**
             * Convert a string to slug format (lowercase with hyphens)
             * @param text - The text to slugify
             * @returns Slugified text
             */
            context.global.slugify = function(text) {
                    return text
                        .toString()
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, "-")           // Replace spaces with -
                        .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
                        .replace(/\-\-+/g, "-")         // Replace multiple - with single -
                        .replace(/^-+/, "")             // Trim - from start of text
                        .replace(/-+$/, "")             // Trim - from end of text
                }

                /**
                 * Chunk an array into smaller arrays of specified size
                 * @param array - The array to chunk
                 * @param size - Size of each chunk
                 * @returns Array of chunks
                 */
            context.global.chunkArray = function(array, size) {
                    if (!Array.isArray(array)) {
                        throw new Error("First argument must be an array")
                    }
                    if (typeof size !== "number" || size <= 0) {
                        throw new Error("Chunk size must be a positive number")
                    }

                    const chunks = []
                    for (let i = 0; i < array.length; i += size) {
                        chunks.push(array.slice(i, i + size))
                    }
                    return chunks
                }

                /**
                 * Debounce a function call
                 * @param func - Function to debounce
                 * @param wait - Wait time in milliseconds
                 * @returns Debounced function
                 */
            context.global.debounce = function(func, wait) {
                    let timeout
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout)
                            func(...args)
                        }
                        clearTimeout(timeout)
                        timeout = setTimeout(later, wait)
                    }
                }

                /**
                 * Deep clone an object
                 * @param obj - Object to clone
                 * @returns Deep cloned object
                 */
            context.global.deepClone = function(obj) {
                    if (obj === null || typeof obj !== "object") {
                        return obj
                    }
                    if (obj instanceof Date) {
                        return new Date(obj.getTime())
                    }
                    if (obj instanceof Array) {
                        return obj.map((item) => this.deepClone(item))
                    }
                    if (obj instanceof Object) {
                        const clonedObj = {}
                        for (const key in obj) {
                            if (obj.hasOwnProperty(key)) {
                                clonedObj[key] = this.deepClone(obj[key])
                            }
                        }
                        return clonedObj
                    }
                }

                /**
                 * Get unique values from an array
                 * @param array - Array to filter
                 * @returns Array with unique values
                 */
            context.global.unique = function(array) {
                    return [...new Set(array)]
                }

                /**
                 * Group array of objects by a key
                 * @param array - Array to group
                 * @param key - Key to group by
                 * @returns Grouped object
                 */
            context.global.groupBy = function(array, key) {
                    return array.reduce((result, item) => {
                        const groupKey = item[key]
                        if (!result[groupKey]) {
                            result[groupKey] = []
                        }
                        result[groupKey].push(item)
                        return result
                    }, {})
                }

                /**
                 * Calculate sum of numbers in an array
                 * @param array - Array of numbers
                 * @returns Sum of all numbers
                 */
            context.global.sum = function(array) {
                    return array.reduce((acc, val) => acc + val, 0)
                }

                /**
                 * Calculate average of numbers in an array
                 * @param array - Array of numbers
                 * @returns Average of all numbers
                 */
            context.global.average = function(array) {
                    if (array.length === 0) return 0
                    return this.sum(array) / array.length
                }

                /**
                 * Format a number with thousand separators
                 * @param number - Number to format
                 * @param separator - Separator character (default: ',')
                 * @returns Formatted number string
                 */
            context.global.formatNumber = function(number, separator = ",") {
                    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator)
                }

                /**
                 * Truncate text to specified length with ellipsis
                 * @param text - Text to truncate
                 * @param maxLength - Maximum length
                 * @param ellipsis - Ellipsis string (default: '...')
                 * @returns Truncated text
                 */
            context.global.truncate = function(text, maxLength, ellipsis = "...") {
                    if (text.length <= maxLength) return text
                    return text.substring(0, maxLength - ellipsis.length) + ellipsis
                }

                /**
                 * Capitalize first letter of each word
                 * @param text - Text to capitalize
                 * @returns Capitalized text
                 */
            context.global.capitalize = function(text) {
                    return text
                        .split(" ")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(" ")
                }

                /**
                 * Retry an async operation with exponential backoff
                 * @param operation - Async function to retry
                 * @param maxRetries - Maximum number of retries
                 * @param initialDelay - Initial delay in milliseconds
                 * @returns Result of operation
                 */
                async retry(operation, maxRetries = 3, initialDelay = 1000) {
                    let lastError
                    for (let i = 0; i < maxRetries; i++) {
                        try {
                            return await operation()
                        } catch (error) {
                            lastError = error
                            if (i < maxRetries - 1) {
                                const delay = initialDelay * Math.pow(2, i)
                                trace?.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`)
                                await new Promise((resolve) => setTimeout(resolve, delay))
                            }
                        }
                    }
                    throw lastError
                }

                /**
                 * Create a hash map from an array using a key function
                 * @param array - Array to convert
                 * @param keyFn - Function to extract key from item
                 * @returns Hash map
                 */
            context.global.toHashMap = function(array, keyFn) {
                    return array.reduce((map, item) => {
                        map[keyFn(item)] = item
                        return map
                    }, {})
                }

            trace?.log?.("Global Utilities Plugin loaded successfully")
        })
    }
}
