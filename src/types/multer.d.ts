declare module 'multer' {
  import { RequestHandler } from 'express';

  type StorageEngine = any;

  interface Multer {
    (options?: any): Multer;
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: { name: string; maxCount?: number }[]): RequestHandler;
    any(): RequestHandler;
    diskStorage(opts: any): StorageEngine;
  }

  const multer: Multer;
  export default multer;
}
