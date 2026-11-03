import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { PLUGIN_ID, register } from './guard.js';
export default definePluginEntry({
    id: PLUGIN_ID,
    name: 'Webhook Guard',
    description: "Blocks agents' scheduled jobs from posting to a URL (webhook delivery).",
    register,
});
