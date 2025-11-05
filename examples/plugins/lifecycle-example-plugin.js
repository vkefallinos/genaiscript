/**
 * Lifecycle Hooks Example Plugin
 * 
 * Demonstrates how to use plugin lifecycle hooks (beforeRun, afterRun, onError)
 * to execute code at specific points during script execution
 * 
 * To use this plugin, add it to your genaiscript.config.json:
 * {
 *   "plugins": ["./examples/plugins/lifecycle-example-plugin.js"]
 * }
 */

export default {
    name: "lifecycle-example-plugin",
    priority: 10, // Higher priority means this runs before other plugins

    setup(extend, hooks, options) {
        const verbose = options?.verbose || false

        // Register beforeRun hook - called before script execution starts
        hooks.beforeRun = hooks.beforeRun || []
        hooks.beforeRun.push(async (context) => {
            console.log(`[Lifecycle Plugin] Starting script: ${context.scriptName || 'unknown'}`)
            
            // You can perform initialization here:
            // - Set up database connections
            // - Load configuration
            // - Initialize external services
            // - Start timers
            
            context.startTime = Date.now()
            
            if (verbose) {
                console.log(`[Lifecycle Plugin] Context:`, Object.keys(context))
            }
        })

        // Register afterRun hook - called after script execution completes
        hooks.afterRun = hooks.afterRun || []
        hooks.afterRun.push(async (context) => {
            const duration = context.startTime 
                ? Date.now() - context.startTime 
                : 0
            
            console.log(`[Lifecycle Plugin] Script completed in ${duration}ms`)
            
            // You can perform cleanup here:
            // - Close database connections
            // - Flush logs
            // - Clean up temporary files
            // - Send analytics
            
            if (verbose) {
                console.log(`[Lifecycle Plugin] Final context:`, Object.keys(context))
            }
        })

        // Register onError hook - called when an error occurs
        hooks.onError = hooks.onError || []
        hooks.onError.push(async (context) => {
            const error = context.error
            
            console.error(`[Lifecycle Plugin] Error occurred: ${error.message}`)
            
            // You can handle errors here:
            // - Log to external service
            // - Send notifications
            // - Create bug reports
            // - Perform recovery actions
            
            if (verbose && error.stack) {
                console.error(`[Lifecycle Plugin] Stack trace:`, error.stack)
            }
            
            // Log error details
            const duration = context.startTime 
                ? Date.now() - context.startTime 
                : 0
            
            console.error(`[Lifecycle Plugin] Script failed after ${duration}ms`)
        })

        // You can also extend contexts as usual
        extend((context) => {
            if (!context.global) context.global = {}
            
            // Add a helper function to measure execution time
            context.global.measureTime = async (name, fn) => {
                const start = Date.now()
                try {
                    const result = await fn()
                    const duration = Date.now() - start
                    console.log(`[Timing] ${name} took ${duration}ms`)
                    return result
                } catch (error) {
                    const duration = Date.now() - start
                    console.error(`[Timing] ${name} failed after ${duration}ms`)
                    throw error
                }
            }
        })

        console.log('[Lifecycle Plugin] Loaded successfully')
    }
}
