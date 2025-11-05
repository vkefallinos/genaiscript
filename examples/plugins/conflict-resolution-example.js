/**
 * Conflict Resolution Examples
 * 
 * This file demonstrates different conflict resolution strategies
 * when multiple plugins extend the same properties.
 * 
 * Run these examples separately to see different strategies in action.
 */

// Example 1: WARN_OVERRIDE Strategy (Default)
// This plugin will warn if another plugin overrides its properties
export const warnOverridePlugin = {
    name: "warn-override-plugin",
    conflictResolution: "warn_override", // This is the default
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.sharedUtility = () => {
                return "Implementation from warn-override-plugin"
            }
        })
    }
}

// Example 2: ERROR Strategy
// This plugin will throw an error if another plugin tries to override its properties
export const errorPlugin = {
    name: "error-plugin",
    conflictResolution: "error",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.criticalFunction = () => {
                return "This function cannot be overridden"
            }
        })
    }
}

// Example 3: MERGE Strategy
// This plugin will merge its properties with other plugins
export const mergePlugin = {
    name: "merge-plugin",
    conflictResolution: "merge",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            
            // This object will be merged with other plugins
            context.global.config = {
                pluginName: "merge-plugin",
                features: ["feature1", "feature2"],
                settings: {
                    enabled: true,
                    maxRetries: 3
                }
            }
        })
    }
}

// Example 4: PRIORITY Strategy
// Higher priority plugins override lower priority ones
export const highPriorityPlugin = {
    name: "high-priority-plugin",
    priority: 100,
    conflictResolution: "priority",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.priorityFunction = () => {
                return "High priority implementation"
            }
        })
    }
}

export const lowPriorityPlugin = {
    name: "low-priority-plugin",
    priority: 10,
    conflictResolution: "priority",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.priorityFunction = () => {
                return "Low priority implementation (will be overridden)"
            }
        })
    }
}

// Example 5: Demonstrating MERGE with arrays
export const arrayMergePlugin1 = {
    name: "array-merge-plugin-1",
    conflictResolution: "merge",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.validators = [
                { name: "email", fn: (val) => val.includes("@") },
                { name: "required", fn: (val) => !!val }
            ]
        })
    }
}

export const arrayMergePlugin2 = {
    name: "array-merge-plugin-2",
    conflictResolution: "merge",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            // These validators will be merged with plugin1's validators
            context.global.validators = [
                { name: "url", fn: (val) => val.startsWith("http") },
                { name: "phone", fn: (val) => /^\d{10}$/.test(val) }
            ]
        })
    }
}

// Example 6: Demonstrating MERGE with nested objects
export const nestedMergePlugin1 = {
    name: "nested-merge-plugin-1",
    conflictResolution: "merge",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            context.global.theme = {
                colors: {
                    primary: "#007bff",
                    secondary: "#6c757d"
                },
                fonts: {
                    body: "Arial, sans-serif"
                }
            }
        })
    }
}

export const nestedMergePlugin2 = {
    name: "nested-merge-plugin-2",
    conflictResolution: "merge",
    setup(extend, hooks, options) {
        extend((context) => {
            if (!context.global) context.global = {}
            // This will be merged with plugin1's theme
            context.global.theme = {
                colors: {
                    success: "#28a745",
                    danger: "#dc3545"
                },
                fonts: {
                    heading: "Georgia, serif"
                },
                spacing: {
                    unit: 8
                }
            }
        })
    }
}

// Default export for testing (uses warn_override)
export default warnOverridePlugin
