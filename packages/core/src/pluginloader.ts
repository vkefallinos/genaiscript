/**
 * Plugin loader for GenAIScript
 * Handles loading plugins from local files and npm packages
 */

import { resolve, isAbsolute, dirname } from "path"
import { pathToFileURL } from "url"
import { tryStat } from "./fs"
import {
    PluginDefinition,
    PluginModule,
    LoadedPlugin,
    PluginExtensionContext,
} from "./plugin"
import debug from "debug"

const dbg = debug("genaiscript:pluginloader")

/**
 * Validates that a loaded module conforms to the plugin API
 */
function validatePlugin(module: any, source: string): PluginDefinition {
    // Check for default export
    let plugin: PluginDefinition | undefined = module?.default || module?.plugin

    if (!plugin) {
        throw new Error(
            `Plugin from '${source}' must export a default plugin definition or named 'plugin' export`
        )
    }

    // Validate required fields
    if (!plugin.name || typeof plugin.name !== "string") {
        throw new Error(
            `Plugin from '${source}' must have a 'name' property of type string`
        )
    }

    if (!plugin.setup || typeof plugin.setup !== "function") {
        throw new Error(
            `Plugin from '${source}' must have a 'setup' property of type function`
        )
    }

    dbg(`validated plugin '${plugin.name}' from ${source}`)
    return plugin
}

/**
 * Resolves a plugin path relative to the project root
 */
async function resolvePluginPath(
    pluginPath: string,
    projectRoot: string
): Promise<string | null> {
    // If absolute path, use as-is
    if (isAbsolute(pluginPath)) {
        const stat = await tryStat(pluginPath)
        return stat?.isFile() ? pluginPath : null
    }

    // Resolve relative to project root
    const resolvedPath = resolve(projectRoot, pluginPath)
    const stat = await tryStat(resolvedPath)
    if (stat?.isFile()) {
        return resolvedPath
    }

    // Try with common extensions
    for (const ext of [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]) {
        const pathWithExt = resolvedPath + ext
        const statExt = await tryStat(pathWithExt)
        if (statExt?.isFile()) {
            return pathWithExt
        }
    }

    return null
}

/**
 * Loads a plugin from a local file path
 */
async function loadPluginFromFile(
    filePath: string,
    projectRoot: string
): Promise<PluginDefinition> {
    dbg(`loading plugin from file: ${filePath}`)

    const resolvedPath = await resolvePluginPath(filePath, projectRoot)
    if (!resolvedPath) {
        throw new Error(`Plugin file not found: ${filePath}`)
    }

    dbg(`resolved plugin path: ${resolvedPath}`)

    try {
        // Import the module
        const fileUrl = pathToFileURL(resolvedPath).href
        const module: PluginModule = await import(fileUrl)

        return validatePlugin(module, filePath)
    } catch (error) {
        throw new Error(
            `Failed to load plugin from '${filePath}': ${error.message}`
        )
    }
}

/**
 * Loads a plugin from an npm package
 */
async function loadPluginFromPackage(
    packageName: string,
    projectRoot: string
): Promise<PluginDefinition> {
    dbg(`loading plugin from package: ${packageName}`)

    try {
        // Try to resolve the package from project's node_modules
        // This will work with both CommonJS and ES modules
        const module: PluginModule = await import(packageName)

        return validatePlugin(module, packageName)
    } catch (error) {
        // If import fails, try to resolve from project root's node_modules
        try {
            const packagePath = resolve(
                projectRoot,
                "node_modules",
                packageName
            )
            const stat = await tryStat(packagePath)
            if (stat?.isDirectory()) {
                const fileUrl = pathToFileURL(packagePath).href
                const module: PluginModule = await import(fileUrl)
                return validatePlugin(module, packageName)
            }
        } catch (resolveError) {
            dbg(`failed to resolve package from node_modules: ${resolveError}`)
        }

        throw new Error(
            `Failed to load plugin package '${packageName}': ${error.message}. Make sure the package is installed.`
        )
    }
}

/**
 * Determines if a plugin string is a file path or package name
 */
function isFilePath(pluginString: string): boolean {
    // Relative paths start with ./ or ../
    // Absolute paths start with / or a drive letter on Windows
    return (
        pluginString.startsWith("./") ||
        pluginString.startsWith("../") ||
        pluginString.startsWith("/") ||
        /^[A-Za-z]:/.test(pluginString)
    )
}

/**
 * Loads a single plugin from a string identifier
 */
export async function loadPlugin(
    pluginIdentifier: string,
    projectRoot: string
): Promise<LoadedPlugin> {
    dbg(`loading plugin: ${pluginIdentifier}`)

    let definition: PluginDefinition

    if (isFilePath(pluginIdentifier)) {
        definition = await loadPluginFromFile(pluginIdentifier, projectRoot)
    } else {
        definition = await loadPluginFromPackage(pluginIdentifier, projectRoot)
    }

    const extensions: Array<(context: PluginExtensionContext) => void> = []

    // Create the extend callback
    const extend = (
        callback: (context: PluginExtensionContext) => void
    ): void => {
        extensions.push(callback)
    }

    // Call the setup function
    try {
        await definition.setup(extend)
        dbg(
            `plugin '${definition.name}' setup complete with ${extensions.length} extensions`
        )
    } catch (error) {
        throw new Error(
            `Plugin '${definition.name}' setup failed: ${error.message}`
        )
    }

    return {
        definition,
        source: pluginIdentifier,
        extensions,
    }
}

/**
 * Loads multiple plugins from an array of identifiers
 */
export async function loadPlugins(
    pluginIdentifiers: string[],
    projectRoot: string
): Promise<LoadedPlugin[]> {
    dbg(`loading ${pluginIdentifiers.length} plugins`)

    const plugins: LoadedPlugin[] = []
    const errors: Array<{ identifier: string; error: Error }> = []

    for (const identifier of pluginIdentifiers) {
        try {
            const plugin = await loadPlugin(identifier, projectRoot)
            plugins.push(plugin)
        } catch (error) {
            dbg(`failed to load plugin '${identifier}': ${error.message}`)
            errors.push({ identifier, error })
        }
    }

    // If there were errors, throw with details
    if (errors.length > 0) {
        const errorMessages = errors
            .map((e) => `  - ${e.identifier}: ${e.error.message}`)
            .join("\n")
        throw new Error(`Failed to load plugins:\n${errorMessages}`)
    }

    return plugins
}

/**
 * Applies plugin extensions to a context
 */
export function applyPluginExtensions(
    plugins: LoadedPlugin[],
    context: PluginExtensionContext
): void {
    dbg(`applying extensions from ${plugins.length} plugins`)

    for (const plugin of plugins) {
        dbg(`applying ${plugin.extensions.length} extensions from '${plugin.definition.name}'`)
        for (const extension of plugin.extensions) {
            try {
                extension(context)
            } catch (error) {
                dbg(
                    `error applying extension from '${plugin.definition.name}': ${error.message}`
                )
                throw new Error(
                    `Error applying extension from plugin '${plugin.definition.name}': ${error.message}`
                )
            }
        }
    }
}
