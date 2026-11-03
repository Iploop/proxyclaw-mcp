export type Options = {
    country?: string;
    state?: string;
    city?: string;
    session?: string;
    asn?: string;
    timeout?: number;
};
export declare function quoteConfig(s: string): string;
export declare function validateOptions(opts: Options, env?: NodeJS.ProcessEnv): void;
export declare function buildConfig(url: string, opts: Options, env: NodeJS.ProcessEnv, meta?: Record<string, unknown>): string;
export declare function curlThroughProxy(url: string, opts?: Options): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}>;
//# sourceMappingURL=transport.d.ts.map