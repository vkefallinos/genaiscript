/**
 * Plugin system for GenAIScript
 * Allows extending core contexts through configuration
 */

/**
 * Context objects that can be extended by plugins
 */
export interface PluginExtensionContext {
    /**
     * Global context extension point
     */
    global?: Record<string, any>

    /**
     * Host context extension point
     */
    host?: Record<string, any>

    /**
     * Workspace context extension point
     */
    workspace?: Record<string, any>

    /**
     * Parsers context extension point
     */
    parsers?: Record<string, any>
}

/**
 * Function type for plugin setup callback
 */
export type PluginSetupFunction = (
    extend: (callback: (context: PluginExtensionContext) => void) => void,
    options?: Record<string, any>
) => void | Promise<void>

/**
 * Plugin configuration object
 */
export interface PluginDefinition {
    /**
     * Unique name for the plugin
     */
    name: string

    /**
     * Setup function called when the plugin is loaded
     */
    setup: PluginSetupFunction
}

/**
 * Plugin module that can be loaded
 */
export interface PluginModule {
    /**
     * Default export should be the plugin definition
     */
    default?: PluginDefinition

    /**
     * Or named export as plugin
     */
    plugin?: PluginDefinition
}

/**
 * Creates a plugin definition
 * @param definition - Plugin configuration
 * @returns Plugin definition object
 */
export function plugin(definition: PluginDefinition): PluginDefinition {
    return definition
}

/**
 * Loaded plugin with its extension callbacks
 */
export interface LoadedPlugin {
    /**
     * Plugin definition
     */
    definition: PluginDefinition

    /**
     * Source of the plugin (file path or package name)
     */
    source: string

    /**
     * Extension callbacks registered by the plugin
     */
    extensions: Array<(context: PluginExtensionContext) => void>
}
