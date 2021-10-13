// Imports the Cloud KMS library
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
import { TokenCredential }from "@azure/identity";
import crypto from  'crypto';

export class Signer {
  private readonly cryptoClient: CryptographyClient;
  private readonly keyClient: KeyClient;
  private readonly keyName: string;

  public constructor(credential:TokenCredential, keyId:string, keyName:string, keyVaultUrl:string) {

    this.cryptoClient = new CryptographyClient(
        keyId, // You can use either the key or the key Id i.e. its url to create a CryptographyClient.
        credential
    );
    this.keyClient = new KeyClient(keyVaultUrl, credential);
    this.keyName = keyName;
  }
  

  public async sign(message: string): Promise<string> {
    const digest = this._hashMessage(message);

    const response = await this.cryptoClient.sign("ES256", digest);
    let signatureBuffer = response.result;
    
    let r = signatureBuffer.slice(0,32);
    let s = signatureBuffer.slice(32);

    return Buffer.concat([r, s]).toString("hex");
  }

  public async getPublicKey(): Promise<string> {

    const latestKey = await this.keyClient.getKey(this.keyName);
    let x = latestKey?.key?.x;
    let y = latestKey?.key?.y;

    let publicKey = Buffer.concat([x!,y!]).toString('hex');
    return publicKey;
  }


  private _hashMessage(message: string): Buffer {
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(message, 'hex'));
    return hash.digest();
  }


}