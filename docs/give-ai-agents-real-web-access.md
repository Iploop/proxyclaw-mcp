# ProxyClaw MCP — V2 source setup

Residential proxy tools for compatible MCP clients. Get credentials at https://platform.iploop.io/.

## Install the updated source
The GitHub implementation is version 1.1.1. Do not assume the npm registry package or a registry catalog has been updated merely because this repository is current.
```bash
git clone https://github.com/Iploop/proxyclaw-mcp.git
cd proxyclaw-mcp
npm ci
npm run build
```
Configure your MCP client to run Node with the absolute path to `dist/index.js`:
```json
{"mcpServers":{"proxyclaw":{"command":"node","args":["/ABSOLUTE/PATH/proxyclaw-mcp/dist/index.js"],"env":{"IPLOOP_API_KEY":"YOUR_ACCOUNT_API_KEY","IPLOOP_PROXY_USERNAME":"YOUR_PROXY_USERNAME","IPLOOP_PROXY_PASSWORD":"YOUR_PROXY_PASSWORD"}}}}
```
Requires Node 18+, npm and curl. Key-only callers retain legacy mode; setting just one V2 proxy credential is rejected. Proxy settings are discovered from the HTTPS platform metadata.

## Tools
- `proxy_fetch`: fetch a public URL; optional ISO country, sticky session, timeout.
- `proxy_check_ip`: returns the observed exit for an optional country.
- `proxy_list_countries`: reference country codes, **not live inventory**.
- `proxy_rotate`: requests a new session; a distinct exit is not guaranteed.

Example `proxy_fetch`: `{"url":"https://example.com","country":"US","session":"demo123","timeout":15}`.

## Deployed V2 state/city targeting
Pass `country`, optional `state` and `city` in `proxy_fetch`. No feature flag is required. State/city selectors are deployed in V2. Country is required; state is optional for a city request. Exact-city accuracy is not certified: some Austin test exits were labeled San Antonio or Schertz by independent geo services. Inspect the observed location when precision matters. V2 ASN targeting remains unavailable.

## Safety and limits
Country input is validated across all traffic tools; selectors and timeouts are validated before network use. Credentials pass to curl through stdin rather than process arguments. Error responses do not echo credentials. Target errors return tool errors; oversized responses are bounded. HTTPS targets protect target TLS, not necessarily the proxy authentication transport.

No universal CAPTCHA/anti-bot, fixed exit, earnings, free quota or live inventory guarantee. Browser rendering and other SDKs require separate compatibility verification.

Tests: `npm test`. Current proxy/SDK guide: https://proxyclaw.ai/docs.html
Support: support@iploop.io
