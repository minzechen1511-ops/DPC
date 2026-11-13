declare module 'postject' {
  export interface InjectOptions {
    sentinelFuse?: string;
    overwrite?: boolean;
    machoSegmentName?: string;
  }

  export function inject(
    filename: string,
    resourceName: string,
    resourceData: Buffer | Uint8Array | ArrayBuffer,
    options?: InjectOptions
  ): Promise<void>;
}
