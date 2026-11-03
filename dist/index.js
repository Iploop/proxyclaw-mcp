#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { curlThroughProxy } from "./transport.js";
// ── Country list (195+ supported) ──
const COUNTRIES = {
    US: "United States", CA: "Canada", GB: "United Kingdom", DE: "Germany",
    FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands", AU: "Australia",
    JP: "Japan", KR: "South Korea", BR: "Brazil", MX: "Mexico", IN: "India",
    SG: "Singapore", SE: "Sweden", NO: "Norway", FI: "Finland", DK: "Denmark",
    PL: "Poland", CH: "Switzerland", AT: "Austria", BE: "Belgium", IE: "Ireland",
    PT: "Portugal", GR: "Greece", CZ: "Czech Republic", HU: "Hungary",
    RO: "Romania", BG: "Bulgaria", HR: "Croatia", SI: "Slovenia", SK: "Slovakia",
    LT: "Lithuania", LV: "Latvia", EE: "Estonia", LU: "Luxembourg", MT: "Malta",
    CY: "Cyprus", IS: "Iceland", AL: "Albania", BA: "Bosnia and Herzegovina",
    MK: "North Macedonia", MD: "Moldova", ME: "Montenegro", RS: "Serbia",
    UA: "Ukraine", BY: "Belarus", RU: "Russia", TR: "Turkey", IL: "Israel",
    SA: "Saudi Arabia", AE: "United Arab Emirates", QA: "Qatar", KW: "Kuwait",
    BH: "Bahrain", OM: "Oman", JO: "Jordan", LB: "Lebanon", EG: "Egypt",
    ZA: "South Africa", NG: "Nigeria", KE: "Kenya", GH: "Ghana", TZ: "Tanzania",
    UG: "Uganda", RW: "Rwanda", ET: "Ethiopia", ZM: "Zambia", ZW: "Zimbabwe",
    MW: "Malawi", MZ: "Mozambique", MG: "Madagascar", MU: "Mauritius",
    SZ: "Eswatini", LS: "Lesotho", BW: "Botswana", NA: "Namibia", AO: "Angola",
    CM: "Cameroon", CI: "Ivory Coast", SN: "Senegal", ML: "Mali", BF: "Burkina Faso",
    NE: "Niger", TD: "Chad", SD: "Sudan", SS: "South Sudan", SO: "Somalia",
    DJ: "Djibouti", ER: "Eritrea", GN: "Guinea", GW: "Guinea-Bissau", SL: "Sierra Leone",
    LR: "Liberia", GM: "Gambia", CV: "Cape Verde", ST: "Sao Tome and Principe",
    GQ: "Equatorial Guinea", GA: "Gabon", CG: "Congo", CD: "DR Congo",
    CF: "Central African Republic", BI: "Burundi", TG: "Togo", BJ: "Benin",
    TH: "Thailand", VN: "Vietnam", ID: "Indonesia", MY: "Malaysia", PH: "Philippines",
    TW: "Taiwan", HK: "Hong Kong", NZ: "New Zealand", CN: "China",
    PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka", NP: "Nepal", MM: "Myanmar",
    KH: "Cambodia", LA: "Laos", BN: "Brunei", MN: "Mongolia", AF: "Afghanistan",
    IR: "Iran", IQ: "Iraq", SY: "Syria", YE: "Yemen", PS: "Palestine",
    KZ: "Kazakhstan", UZ: "Uzbekistan", TM: "Turkmenistan", KG: "Kyrgyzstan",
    TJ: "Tajikistan", GE: "Georgia", AM: "Armenia", AZ: "Azerbaijan",
    AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru", VE: "Venezuela",
    EC: "Ecuador", BO: "Bolivia", PY: "Paraguay", UY: "Uruguay", GY: "Guyana",
    SR: "Suriname", GF: "French Guiana", CR: "Costa Rica", PA: "Panama",
    GT: "Guatemala", HN: "Honduras", SV: "El Salvador", NI: "Nicaragua",
    CU: "Cuba", HT: "Haiti", DO: "Dominican Republic", JM: "Jamaica",
    TT: "Trinidad and Tobago", BB: "Barbados", BS: "Bahamas", AG: "Antigua and Barbuda",
    KN: "Saint Kitts and Nevis", LC: "Saint Lucia", VC: "Saint Vincent",
    GD: "Grenada", DM: "Dominica", BZ: "Belize",
};
// ── MCP Tools ──
const TOOLS = [
    {
        name: "proxy_fetch",
        description: "Fetch a URL through the ProxyClaw residential proxy network. " +
            "Uses residential proxy routing; country availability depends on the live pool. " +
            "Use for public-page fetching and geo checks; target acceptance is not guaranteed.",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "URL to fetch (must start with http:// or https://)",
                },
                country: {
                    type: "string",
                    description: "2-letter country code to route through (e.g., US, DE, JP). Auto-rotate if omitted.",
                },
                state: { type: "string", description: "V2 state selector; requires country" },
                city: {
                    type: "string",
                    description: "V2 city selector; requires country. Exact-city geolocation varies across providers",
                },
                session: {
                    type: "string",
                    description: "Session ID for sticky routing; continuity depends on device availability",
                },
                asn: {
                    type: "string",
                    description: "ASN number for ISP-level targeting (optional)",
                },
                timeout: {
                    type: "number",
                    description: "Request timeout in seconds (1-120, default: 30)",
                },
            },
            required: ["url"],
        },
    },
    {
        name: "proxy_check_ip",
        description: "Check the current exit IP address and geo-location when routing through the proxy. " +
            "Useful to verify which country/region your requests are coming from.",
        inputSchema: {
            type: "object",
            properties: {
                country: {
                    type: "string",
                    description: "2-letter country code to check exit IP from (optional, auto-rotate if omitted)",
                },
            },
            required: [],
        },
    },
    {
        name: "proxy_list_countries",
        description: "List reference country codes; not a live inventory or availability guarantee.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "proxy_rotate",
        description: "Request a new random session. " +
            "Returns the observed exit; a distinct IP is not guaranteed.",
        inputSchema: {
            type: "object",
            properties: {
                country: {
                    type: "string",
                    description: "2-letter country code (optional)",
                },
            },
            required: [],
        },
    },
];
// ── Server Setup ──
const server = new Server({
    name: "proxyclaw-mcp",
    version: "1.1.1",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // ── proxy_fetch ──
    if (name === "proxy_fetch") {
        const url = String(args?.url || "");
        if (!url.match(/^https?:\/\//)) {
            return {
                content: [{ type: "text", text: "Error: URL must start with http:// or https://" }],
                isError: true,
            };
        }
        const country = args?.country ? String(args.country).toUpperCase() : undefined;
        const state = args?.state ? String(args.state) : undefined;
        const city = args?.city ? String(args.city) : undefined;
        const session = args?.session ? String(args.session) : undefined;
        const asn = args?.asn ? String(args.asn) : undefined;
        const timeout = Math.min(120, Math.max(1, Number(args?.timeout || 30)));
        const result = await curlThroughProxy(url, { country, state, city, session, asn, timeout });
        if (result.exitCode !== 0) {
            const safeStderr = result.stderr;
            return {
                content: [{ type: "text", text: `Proxy fetch failed (exit ${result.exitCode}):\n${safeStderr}` }],
                isError: true,
            };
        }
        // Truncate if too large for MCP context
        const maxLen = 50000;
        const text = result.stdout.length > maxLen
            ? result.stdout.slice(0, maxLen) + `\n\n[...truncated ${result.stdout.length - maxLen} chars]`
            : result.stdout;
        return {
            content: [{ type: "text", text }],
        };
    }
    // ── proxy_check_ip ──
    if (name === "proxy_check_ip") {
        const country = args?.country ? String(args.country).toUpperCase() : undefined;
        const result = await curlThroughProxy("https://httpbin.org/ip", { country, timeout: 15 });
        if (result.exitCode !== 0) {
            return {
                content: [{ type: "text", text: `IP check failed: ${result.stderr}` }],
                isError: true,
            };
        }
        return {
            content: [{ type: "text", text: `Exit IP info:\n${result.stdout}` }],
        };
    }
    // ── proxy_list_countries ──
    if (name === "proxy_list_countries") {
        const list = Object.entries(COUNTRIES)
            .map(([code, name]) => `${code}: ${name}`)
            .join("\n");
        return {
            content: [{ type: "text", text: `Reference country codes (${Object.keys(COUNTRIES).length}); live availability varies:\n\n${list}` }],
        };
    }
    // ── proxy_rotate ──
    if (name === "proxy_rotate") {
        const country = args?.country ? String(args.country).toUpperCase() : undefined;
        const sessionId = `rotate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const result = await curlThroughProxy("https://httpbin.org/ip", { country, session: sessionId, timeout: 15 });
        if (result.exitCode !== 0) {
            return {
                content: [{ type: "text", text: `Rotation failed: ${result.stderr}` }],
                isError: true,
            };
        }
        return {
            content: [{ type: "text", text: `New session requested (session: ${sessionId}):\n${result.stdout}` }],
        };
    }
    return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
    };
});
// ── Start ──
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Server runs silently on stdio — no console output after start
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map