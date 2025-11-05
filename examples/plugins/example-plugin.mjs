/**
 * Example GenAIScript Plugin
 * 
 * This demonstrates how to create a plugin that extends GenAIScript's functionality.
 * To use this plugin, add it to your genaiscript.config.json:
 * 
 * {
 *   "plugins": ["./examples/plugins/example-plugin.mjs"]
 * }
 */

export default {
    name: 'example-plugin',
    
    /**
     * Setup function is called when the plugin is loaded
     * @param extend - Function to register context extensions
     * @param options - Optional configuration passed to the plugin
     */
    setup(extend, options) {
        console.log('Example plugin loaded with options:', options)
        
        // Register an extension that adds custom functionality
        extend((context) => {
            // Extend global context with a custom task function
            if (!context.global) {
                context.global = {}
            }
            
            context.global.defTask = (name, fn) => {
                console.log(`Registering task: ${name}`)
                return fn
            }
            
            // Extend parsers with a custom parser
            if (!context.parsers) {
                context.parsers = {}
            }
            
            context.parsers.readCustomFormat = async (file) => {
                console.log(`Parsing custom format: ${file}`)
                return {
                    content: 'Parsed content from custom format',
                    metadata: {}
                }
            }
            
            // Extend workspace with custom query functionality
            if (!context.workspace) {
                context.workspace = {}
            }
            
            context.workspace.customQuery = async (query) => {
                console.log(`Executing custom query: ${query}`)
                return []
            }
            
            // Extend host with custom service
            if (!context.host) {
                context.host = {}
            }
            
            context.host.customService = () => {
                return 'Custom service result'
            }
        })
    }
}
