import { ec as EC } from 'elliptic';
import { SHA3 } from 'sha3';
import * as fcl from '@onflow/fcl';
import * as types from '@onflow/types';

const ec = new EC('p256');

export class Util {
  constructor(apiUrl: string) {
    fcl.config().put('accessNode.api', apiUrl);
  }

  async createFlowAccount(flowPublicKey: string) {
    const authorization = this.authorize({
        // default emulator account address
        address: "0xf8d6e0586b0a20c7", 
        // default emulator account private key
        privateKey: "7b1121b224b7623bbb9ba6c2a9ab11b03940baa3222bbb3f45e327170a51298c", 
        keyIndex: 0
    });
  
    const response = await fcl.send([
      fcl.transaction`
        transaction(publicKey: String) {
          prepare(signer: AuthAccount) {

            let key = PublicKey(
                publicKey: publicKey.decodeHex(),
                signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
            )

            let account = AuthAccount(payer: signer)

            account.keys.add(
                publicKey: key,
                hashAlgorithm: HashAlgorithm.SHA2_256,
                weight: 1000.0 as UFix64
            )
          }
        }
      `,
      fcl.args([ fcl.arg(flowPublicKey, types.String) ]),
      fcl.proposer(authorization),
      fcl.authorizations([authorization]),
      fcl.payer(authorization),
      fcl.limit(9999),
    ]);
    const { events } = await fcl.tx(response).onceSealed();
    const accountCreatedEvent = events.find((d: any) => d.type === 'flow.AccountCreated');
    if (!accountCreatedEvent) throw new Error('No flow.AccountCreated found');
    let address = accountCreatedEvent.data.address.replace(/^0x/, '');
    if (!address) throw new Error('An address is required');
    return address;
  }

  authorize({ address, privateKey, keyIndex }: { address: string, privateKey: string, keyIndex: number }) {
    return async (account: any = {}) => {
      return {
        ...account,
        tempId: [address, keyIndex].join("-"),
        addr: fcl.sansPrefix(address),
        keyId: Number(keyIndex),
        resolve: null,
        signingFunction: async(data: any) => {
          return {
            addr: fcl.withPrefix(address),
            keyId: Number(keyIndex),
            signature: await this.signWithKey(privateKey, data.message),
          };
        }
      };
    };
  };

  signWithKey(privateKey: string, msg: string) {
    const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'));
    const sig = key.sign(this.hashMsg(msg));
    const n = 32;
    const r = sig.r.toArrayLike(Buffer, 'be', n);
    const s = sig.s.toArrayLike(Buffer, 'be', n);
    return Buffer.concat([r, s]).toString('hex');
  };

  hashMsg(msg: string) {
    const sha = new SHA3(256);
    sha.update(Buffer.from(msg, 'hex'));
    return sha.digest();
  };
}