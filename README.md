# 🌐 ProxyClaw MCP Server

**Model Context Protocol (MCP) server for ProxyClaw by IPLoop.**

Route web requests through 175M+ residential IPs across 195+ countries — directly from Claude Desktop, Cursor, Zed, or any MCP-compatible client.

> **The only residential proxy network with an MCP server.** Your AI can now browse from real homes, not datacenters.

---

## ✨ What You Get

- **195+ countries** — Route requests through real residential IPs
- **Anti-bot bypass** — Cloudflare, DataDome, PerimeterX can't tell the difference
- **Zero config** — One environment variable, four powerful tools
- **Sticky sessions** — Same IP across multiple requests
- **City & ISP targeting** — Pinpoint precision when you need it

## ⚡ Node.js vs Python — Which One?

We ship **two** MCP servers. Choose based on what you need:

| | **This repo (Node.js)** | **[Python version](https://github.com/Iploop/proxyclaw-mcp-py)** |
|---|---|---|
| **What it does** | Proxy routing + fetch | Full anti-bot + headless render + structured extraction |
| **Best for** | Simple fetches, geo-targeting | Scraping protected sites (Amazon, eBay, LinkedIn), JS-rendered pages |
| **Anti-detection** | Chrome fingerprint headers | TLS JA3 spoofing + Playwright anti-detection |
| **Install** | `npx proxyclaw-mcp-server` | `uvx proxyclaw-mcp-server[all]` |
| **Tools** | 4 (fetch, check_ip, list_countries, rotate) | 6 (+ stealth fetch, render, scrape, extract) |

**→ Use Node.js** if you just need to route requests through residential IPs.

**→ Use Python** if you're scraping hard targets (Cloudflare, SPAs, React sites) or need structured data extraction from 60+ supported sites.

Both use the same proxy network — just different levels of power.

---

## 🚀 Install (30 seconds)

### 1. Get Your Free API Key

Sign up at **[iploop.io/signup](https://iploop.io/signup.html)** — 0.5 GB free, no credit card.

### 2. Add to Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "proxyclaw": {
      "command": "npx",
      "args": ["-y", "proxyclaw-mcp-server"],
      "env": {
        "IPLOOP_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. Done.

### 3. Verify

Ask Claude:

> "Check my exit IP through the proxy"

Claude will call `proxy_check_ip` and show you the residential IP you're routing through.

---

## 🛠️ Available Tools

### `proxy_fetch`

Fetch any URL through a residential proxy.

```json
{
  "url": "https://example.com",
  "country": "US",
  "city": "newyork",
  "session": "my-session-id",
  "timeout": 30
}
```

**Use when:** Scraping geo-restricted sites, checking prices by region, bypassing bot detection.

### `proxy_check_ip`

Check which IP and country you're exiting from.

```json
{
  "country": "DE"
}
```

**Use when:** Verifying your proxy location before scraping.

### `proxy_list_countries`

List all 195+ available countries.

```json
{}
```

**Use when:** You need to know the exact 2-letter code for Madagascar.

### `proxy_rotate`

Force a new IP rotation.

```json
{
  "country": "GB"
}
```

**Use when:** Your current IP got rate-limited and you need a fresh one.

---

## 💬 Example Conversations

> **You:** "Check what Amazon.com shows from a US IP"
>
> **Claude:** *[calls proxy_fetch with country=US, returns HTML]*

> **You:** "Now check the same page from Japan"
>
> **Claude:** *[calls proxy_fetch with country=JP, returns different pricing/content]*

> **You:** "List all countries where I can route through"
>
> **Claude:** *[calls proxy_list_countries, returns 195+ countries]*

> **You:** "My current IP is blocked. Rotate to a new UK IP"
>
> **Claude:** *[calls proxy_rotate with country=GB, confirms new IP]*

---

## 🔒 Security

- API key is passed via environment variable — never hardcoded
- All traffic to target sites is TLS-encrypted
- Proxy auth is plaintext to our proxy gateway only (same as any HTTP proxy)
- No data is logged or stored by the MCP server

---

## 📦 Advanced: Local Install

```bash
npm install -g proxyclaw-mcp-server

# Run directly
IPLOOP_API_KEY=your_key proxyclaw-mcp-server
```

Or with Docker:

```bash
docker run -e IPLOOP_API_KEY=your_key proxyclaw/mcp-server
```

---

## 🆓 Free Tier

- **0.5 GB** bandwidth included
- All 195+ countries available
- No credit card required

Upgrade anytime at [iploop.io](https://iploop.io).

---

## 🔗 Links

- **Website:** [proxyclaw.ai](https://proxyclaw.ai)
- **Platform:** [iploop.io](https://iploop.io)
- **GitHub:** [github.com/Iploop/proxyclaw-mcp](https://github.com/Iploop/proxyclaw-mcp)
- **MCP Docs:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

Built with ⚡ by [IPLoop](https://iploop.io)
