import * as fcl from '@onflow/fcl';
import { Signer } from './signer';

export class AzureVaultAuthorizer {
  private readonly signer: Signer;

  public constructor(credential:any, keyId:string, keyName:string, keyVaultUrl:string) {
    this.signer = new Signer(credential, keyId, keyName, keyVaultUrl);
  }

  public authorize(accountAddress: string, keyIndex: number) {
    return async (account: any = {}) => {
      return {
        ...account,
        tempId: [accountAddress, keyIndex].join("-"),
        addr: fcl.sansPrefix(accountAddress),
        keyId: Number(keyIndex),
        resolve: null,
        signingFunction: async(data: any) => {
          return {
            addr: fcl.withPrefix(accountAddress),
            keyId: Number(keyIndex),
            signature: await this.signer.sign(data.message)
          };
        }
      };
    };
  };

  public async getPublicKey() {
    return await this.signer.getPublicKey();
  }
}