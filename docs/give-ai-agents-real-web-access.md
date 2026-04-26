# Give Claude/Cursor Real Web Access with ProxyClaw MCP

AI agents are great at reasoning, but most web-access tools still fetch from datacenter IPs. That is a problem when you need to test geo-specific content, verify SERPs by country, scrape regional pricing, or debug pages that treat datacenter traffic differently from real users.

ProxyClaw MCP gives Claude Desktop, Cursor, Zed, and other MCP clients a residential proxy toolset directly inside the agent.

## What is ProxyClaw MCP?

ProxyClaw MCP is an open-source Model Context Protocol server for routing agent web requests through the IPLoop / ProxyClaw residential proxy network.

It lets an AI agent:

- fetch URLs through residential IPs
- choose country/city targeting
- verify the current exit IP
- rotate sessions
- use stronger Python anti-bot/rendering workflows when needed

Node.js server:

```bash
npx proxyclaw-mcp-server
```

Python server:

```bash
uvx proxyclaw-mcp-server[all]
```

## Claude Desktop config

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

Get a free key: https://iploop.io/signup.html

## Tools

- `proxy_fetch` — fetch any URL through a residential proxy
- `proxy_check_ip` — verify the exit IP and location
- `proxy_list_countries` — list available country codes
- `proxy_rotate` — rotate the session/IP

The Python version adds:

- `proxy_fetch_stealth`
- `proxy_render`
- `proxy_scrape`
- `proxy_extract`

## Example prompts

> Check my exit IP through a US residential proxy.

> Fetch this ecommerce page from Germany and summarize the visible pricing.

> Compare this page from US vs UK exit IPs.

> Rotate my proxy session and verify the new IP.

## Why it matters

Agents need real-world web context. Plain fetch tools are useful, but they do not reproduce how websites behave for residential users in different locations.

ProxyClaw gives agents a more realistic network layer:

- residential IPs
- geo-targeting
- sticky sessions
- rotation
- MCP-native workflow

## Links

- Node MCP: https://github.com/Iploop/proxyclaw-mcp
- Python MCP: https://github.com/Iploop/proxyclaw-mcp-py
- Docs: https://proxyclaw.ai/docs
- npm: https://www.npmjs.com/package/proxyclaw-mcp-server
- PyPI: https://pypi.org/project/proxyclaw-mcp-server/
