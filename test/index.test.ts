import { AzureVaultAuthorizer } from '../src/index';
import { Util } from './utils';
import * as fcl from '@onflow/fcl';
import * as dotenv from "dotenv";
dotenv.config();

// extracting the key configuration from .env file for test
const keyId = process.env.KEY_ID!;
const keyName = process.env.KEY_NAME!;
const keyVaultUrl = process.env.KEY_VAULT_URL!;

// Test transaction
const transaction = `
transaction {
  prepare(signer: AuthAccount) {
    log("Test transaction signed by fcl-azurevault-authorizer")
  }
}
`;

const flowAccessNodeUrl = 'http://localhost:8080';


// start an emulator before running the test using 'flow emulator -v'
describe('AzureVaultAuthorizer', () => {
  test('transaction signed by AzureVaultAuthorizer should succeed', async () => {

    const authorizer = new AzureVaultAuthorizer(keyId, keyName, keyVaultUrl);

    const util = new Util(flowAccessNodeUrl);
    const publicKey = await authorizer.getPublicKey();
    console.log("public key : ", publicKey);
    
    const address = await util.createFlowAccount(publicKey);
    const keyIndex = 0;

    const authorization = authorizer.authorize(address, keyIndex);
    expect(typeof authorization).toBe('function');

    fcl.config().put('accessNode.api', flowAccessNodeUrl);
    const response = await fcl.send([
      fcl.transaction`${transaction}`,
      fcl.args([]),
      fcl.proposer(authorization),
      fcl.authorizations([authorization]),
      fcl.payer(authorization),
      fcl.limit(9999),
    ]);
    const res = await fcl.tx(response).onceSealed();
    expect(res.statusCode).toBe(0);
  });
})