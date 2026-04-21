declare module "jsencrypt" {
  export class JSEncrypt {
    constructor(options?: { default_key_size?: string | number });
    setPublicKey(publicKey: string): void;
    encrypt(str: string): string | false;
  }
}
