export { defineConfig, type TailfinConfig } from "./config";

// Everything a tailfin.config.ts needs to write its own rules, scanners and plugins.
export {
    ExternalEvent,
    ExternalReference,
    ReferenceScanner,
    TailfinPlugin,
    Task,
    type Derivation,
    type PluginContext,
    type TaskRouterRule,
} from "tailfin-core";
