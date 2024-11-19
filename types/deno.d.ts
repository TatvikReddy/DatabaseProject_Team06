
declare namespace Deno {
  function readTextFile(path: string): Promise<string>;
  function cwd(): string;
}