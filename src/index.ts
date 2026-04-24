#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";

// ── Config ──
const PROXY_HOST = process.env.PROXY_HOST || "proxy.iploop.io";
const PROXY_PORT = process.env.PROXY_PORT || "8880";
const API_KEY = process.env.IPLOOP_API_KEY || "";

if (!API_KEY) {
  console.error("Warning: IPLOOP_API_KEY not set. Server will start but tools will return an error.");
  console.error("Get your free key at https://iploop.io/signup.html");
}

// ── Country list (195+ supported) ──
const COUNTRIES: Record<string, string> = {
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

// ── Helper: run curl through proxy ──
function curlThroughProxy(
  url: string,
  opts: { country?: string; city?: string; session?: string; asn?: string; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let auth = `:${API_KEY}`;
    if (opts.country) auth += `-country-${opts.country.toUpperCase()}`;
    if (opts.city) auth += `-city-${opts.city.toLowerCase()}`;
    if (opts.session) auth += `-session-${opts.session}`;
    if (opts.asn) auth += `-asn-${opts.asn}`;

    const args = [
      "--proxy", `http://${PROXY_HOST}:${PROXY_PORT}`,
      "--proxy-user", auth,
      "--max-time", String(opts.timeout || 30),
      "--silent",
      "--show-error",
      "--location",
      "-A", "ProxyClaw-MCP/1.0",
      url,
    ];

    const proc = spawn("curl", args, { timeout: (opts.timeout || 30) * 1000 + 5000 });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });

    proc.on("error", (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

// ── MCP Tools ──
const TOOLS: Tool[] = [
  {
    name: "proxy_fetch",
    description:
      "Fetch a URL through the ProxyClaw residential proxy network. " +
      "Routes the request through real residential IPs in 195+ countries. " +
      "Use for geo-restricted content, anti-bot bypass, or multi-country research.",
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
        city: {
          type: "string",
          description: "City name for city-level targeting (optional)",
        },
        session: {
          type: "string",
          description: "Session ID for sticky IP (same IP across requests with same session ID)",
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
    description:
      "Check the current exit IP address and geo-location when routing through the proxy. " +
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
    description:
      "List all 195+ countries available for routing through the ProxyClaw residential network.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "proxy_rotate",
    description:
      "Force IP rotation by fetching with a new random session. " +
      "Returns the new exit IP to confirm rotation worked.",
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
const server = new Server(
  {
    name: "proxyclaw-mcp",
    version: "1.0.2",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!API_KEY) {
    return {
      content: [{ type: "text", text: "Error: IPLOOP_API_KEY environment variable is required. Get your free key at https://iploop.io/signup.html" }],
      isError: true,
    };
  }

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
    const city = args?.city ? String(args.city) : undefined;
    const session = args?.session ? String(args.session) : undefined;
    const asn = args?.asn ? String(args.asn) : undefined;
    const timeout = Math.min(120, Math.max(1, Number(args?.timeout || 30)));

    if (country && !COUNTRIES[country]) {
      return {
        content: [{ type: "text", text: `Error: Unknown country code '${country}'. Use proxy_list_countries to see available options.` }],
        isError: true,
      };
    }

    const result = await curlThroughProxy(url, { country, city, session, asn, timeout });

    if (result.exitCode !== 0) {
      const safeStderr = result.stderr.replace(new RegExp(API_KEY, "g"), "[REDACTED]");
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
      content: [{ type: "text", text: `Available countries (${Object.keys(COUNTRIES).length}):\n\n${list}` }],
    };
  }

  // ── proxy_rotate ──
  if (name === "proxy_rotate") {
    const country = args?.country ? String(args.country).toUpperCase() : undefined;
    const sessionId = `rotate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await curlThroughProxy("https://httpbin.org/ip", { country, session: sessionId, timeout: 15 });

    if (result.exitCode !== 0) {
      return {
        content: [{ type: "text", text: `Rotation failed: ${result.stderr}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: `IP rotated (session: ${sessionId}):\n${result.stdout}` }],
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
