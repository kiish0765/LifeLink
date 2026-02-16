declare module 'express' {
  interface Application {}
  interface Request {}
  interface Response {}
  function express(): Application;
  export = express;
}
declare module 'cors' {
  const e: any;
  export default e;
}
declare module 'pg' {
  const pg: any;
  export default pg;
}
declare module 'ws' {
  const ws: any;
  export default ws;
}
declare module 'bcryptjs' {
  function hash(p: string, s: number): Promise<string>;
  function compare(p: string, h: string): Promise<boolean>;
}
declare module 'jsonwebtoken' {
  function sign(p: object, s: string): string;
  function verify(t: string, s: string): object;
}
declare module 'nodemailer' {
  const n: any;
  export default n;
}
declare const process: {
  env: Record<string, string | undefined>;
};
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
declare const Buffer: any;
declare const http: any;
declare const https: any;
declare const path: any;
declare const url: any;
declare const net: any;
