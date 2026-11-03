import { spawn } from 'node:child_process';
import { isIP } from 'node:net';

export type Options = {country?: string; state?: string; city?: string; session?: string; asn?: string; timeout?: number};
const iso = new Set('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));
export function quoteConfig(s: string): string {
  if (/[\r\n\0]/.test(s)) throw new Error('Invalid configuration characters');
  return '"' + s.replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '"';
}
export function validateOptions(opts: Options, env: NodeJS.ProcessEnv = process.env): void {
  if (opts.country && !iso.has(opts.country.toUpperCase())) throw new Error('Country must be a valid ISO alpha-2 code');
  for (const s of [opts.state, opts.city, opts.session]) if (s && !/^[A-Za-z0-9_]{1,64}$/.test(s)) throw new Error('Selectors require 1-64 letters, digits or underscores');
  if (opts.asn && !/^\d{1,10}$/.test(opts.asn)) throw new Error('ASN must be numeric');
  if (opts.timeout !== undefined && (!Number.isInteger(opts.timeout) || opts.timeout < 1 || opts.timeout > 120)) throw new Error('Timeout must be an integer from 1 to 120');
  const v2 = env.IPLOOP_PROXY_USERNAME !== undefined || env.IPLOOP_PROXY_PASSWORD !== undefined;
  if (v2) {
    if (!env.IPLOOP_PROXY_USERNAME || !env.IPLOOP_PROXY_PASSWORD || !/^[A-Za-z0-9_]+$/.test(env.IPLOOP_PROXY_USERNAME)) throw new Error('V2 requires both proxy username and proxy password');
    if (opts.asn) throw new Error('V2 ASN targeting is not available');
    if (opts.state || opts.city) {
      if (env.IPLOOP_V2_CITY_ENABLED !== '1') throw new Error('V2 state/city targeting is pending server rollout; not yet deployed');
      if (!opts.country || (opts.city && !opts.state)) throw new Error('V2 city targeting requires country and state');
    }
  } else {
    if (!env.IPLOOP_API_KEY) throw new Error('Get credentials at https://platform.iploop.io/');
    if (opts.state) throw new Error('State selector is a V2 capability');
  }
}
export function buildConfig(url: string, opts: Options, env: NodeJS.ProcessEnv, meta?: Record<string, unknown>): string {
  validateOptions(opts, env);
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Target must be a credential-free HTTP(S) URL');
  const v2 = env.IPLOOP_PROXY_USERNAME !== undefined || env.IPLOOP_PROXY_PASSWORD !== undefined;
  let username: string, password: string, endpoint: string;
  if (v2) {
    const host = meta?.proxy_host, port = meta?.http_port;
    if (typeof host !== 'string' || isIP(host) || !/^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(host) || typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid portal proxy metadata');
    endpoint = 'http://' + host + ':' + port;
    username = env.IPLOOP_PROXY_USERNAME!; password = env.IPLOOP_PROXY_PASSWORD!;
    for (const [k,v] of [['country',opts.country?.toLowerCase()],['state',opts.state],['city',opts.city],['session',opts.session]]) if (v) username += '-' + k + '-' + v;
  } else {
    const host = env.PROXY_HOST || 'proxy.iploop.io';
    const port = env.PROXY_PORT || '8880';
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(host) || !/^\d+$/.test(port) || +port < 1 || +port > 65535) throw new Error('Invalid legacy proxy endpoint');
    endpoint = 'http://' + host + ':' + port; username = 'iploop'; password = env.IPLOOP_API_KEY!;
    for (const [k,v] of [['country',opts.country?.toUpperCase()],['city',opts.city],['session',opts.session],['asn',opts.asn]]) if (v) password += '-' + k + '-' + v;
  }
  return 'proxy = ' + quoteConfig(endpoint) + '\nproxy-user = ' + quoteConfig(username + ':' + password) + '\nurl = ' + quoteConfig(url) + '\n';
}
let metadataPromise: Promise<Record<string, unknown>> | undefined;
export async function curlThroughProxy(url: string, opts: Options = {}): Promise<{stdout: string; stderr: string; exitCode: number}> {
  try {
    validateOptions(opts);
    let meta: Record<string, unknown> | undefined;
    if (process.env.IPLOOP_PROXY_USERNAME !== undefined || process.env.IPLOOP_PROXY_PASSWORD !== undefined) {
      if (!metadataPromise) metadataPromise = (async () => {
        const portal = new URL(process.env.IPLOOP_PORTAL_URL || 'https://platform.iploop.io');
        if (portal.protocol !== 'https:' || portal.username || portal.password || portal.search || portal.hash) throw new Error('Portal must be credential-free HTTPS');
        const r = await fetch(portal.href.replace(/\/$/,'') + '/v1/meta', {signal: AbortSignal.timeout(15000)});
        if (!r.ok) throw new Error('Portal metadata unavailable');
        return await r.json() as Record<string, unknown>;
      })();
      meta = await metadataPromise;
    }
    const config = buildConfig(url, opts, process.env, meta);
    return await new Promise(resolve => {
      const timeout = opts.timeout || 30;
      const p = spawn('curl', ['--config','-','--silent','--show-error','--fail','--max-time',String(timeout)], {timeout: timeout * 1000 + 5000});
      let stdout = '', tooLarge = false;
      p.stdin.on('error', () => {});
      p.stdout.on('data', d => {
        if (Buffer.byteLength(stdout) + d.length > 2_000_000) {tooLarge = true; p.kill();} else stdout += d.toString();
      });
      p.stderr.on('data', () => {});
      p.on('error', () => resolve({stdout:'', stderr:'Proxy process failed', exitCode:1}));
      p.on('close', code => resolve({stdout, stderr:tooLarge ? 'Response exceeded size limit' : code === 0 ? '' : 'Proxy request failed; check credentials, pool availability and target status', exitCode:tooLarge ? 1 : code ?? 1}));
      p.stdin.end(config);
    });
  } catch (e) {
    const msg = e instanceof Error && /^(Country |Selectors |ASN |Timeout |V2 |State selector|Get credentials|Target must|Portal must|Invalid portal)/.test(e.message) ? e.message : 'Invalid configuration or request failed';
    return {stdout:'', stderr:msg, exitCode:1};
  }
}
