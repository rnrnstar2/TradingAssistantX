"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AUTONOMOUS_CONFIG = void 0;
exports.loadAutonomousConfig = loadAutonomousConfig;
const fs_1 = require("fs");
const js_yaml_1 = __importDefault(require("js-yaml"));
function loadAutonomousConfig() {
    const configPath = 'data/autonomous-config.yaml';
    if (!(0, fs_1.existsSync)(configPath)) {
        throw new Error(`Autonomous config file not found: ${configPath}`);
    }
    const configContent = (0, fs_1.readFileSync)(configPath, 'utf8');
    const config = js_yaml_1.default.load(configContent);
    // 設定値検証
    if (!config.execution || !config.autonomous_system) {
        throw new Error('Invalid autonomous config structure');
    }
    return config;
}
exports.DEFAULT_AUTONOMOUS_CONFIG = {
    execution: {
        mode: 'scheduled_posting',
        posting_interval_minutes: 96,
        health_check_enabled: true,
        maintenance_enabled: true
    },
    autonomous_system: {
        max_parallel_tasks: 3,
        context_sharing_enabled: true,
        decision_persistence: false
    },
    claude_integration: {
        sdk_enabled: true,
        max_context_size: 50000
    },
    data_management: {
        cleanup_interval: 3600000,
        max_history_entries: 100
    }
};
