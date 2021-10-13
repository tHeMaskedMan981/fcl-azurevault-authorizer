import { AzureVaultAuthorizer } from '../src/index';
import { Util } from './utils';
import * as fcl from '@onflow/fcl';
import * as dotenv from "dotenv";
import {DefaultAzureCredential, ClientSecretCredential} from '@azure/identity';
dotenv.config();

// extracting the key configuration from .env file for test
// const keyId = process.env.KEY_ID!;
// const keyName = process.env.KEY_NAME!;
// const keyVaultUrl = process.env.KEY_VAULT_URL!;

const keyId = "https://faze.vault.azure.net/keys/testkey001/765b41e57df848608bf68d9523e88005";
const keyName = "testkey001";
const keyVaultUrl = "https://faze.vault.azure.net";

// Test transaction
const transaction = `
transaction {
  prepare(signer: AuthAccount) {
    log("Test transaction signed by fcl-azurevault-authorizer")
  }
}
`;

const flowAccessNodeUrl = 'http://localhost:8080';

jest.setTimeout(20000);

// start an emulator before running the test using 'flow emulator -v'
describe('AzureVaultAuthorizer', () => {
  test('transaction signed by AzureVaultAuthorizer should succeed', async () => {

    const credential = new DefaultAzureCredential();

    // Use ClientSecretCredential if don't want to use DefaultAzureCredential
    // const credential = new ClientSecretCredential(
    //   <tenant-id>,
    //   <client-id>,
    //   <client-secret>
    // );

    const authorizer = new AzureVaultAuthorizer(credential, keyId, keyName, keyVaultUrl);

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