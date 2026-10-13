import info from "./apk.json";

export const APK = info as {
  version: string;
  bytes: number;
  sha256: string;
  certSha256: string;
  archivo: string;
};

export function tamano(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
