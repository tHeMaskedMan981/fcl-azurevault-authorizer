import * as fcl from '@onflow/fcl';
import { AzureVaultAuthorizer } from '../src/authorizer';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';

// Key configuration. Keep this data secret. Although no one can get access to your keys, they can still 
// use it to sign transactions if this configuration info along with account credentials are leaked.
const keyId = "https://<vault-name>.vault.azure.net/keys/<keyName>/xxxxxxxxxxxxxxxx";
const keyVaultUrl = 'https://<vault-name>.vault.azure.net';
const keyName = 'admin-key';

// Test transaction
const transaction = `
transaction {
  prepare(signer: AuthAccount) {
    log("Test transaction signed by fcl-azurevault-authorizer")
  }
}
`;

const apiUrl = 'http://localhost:8080';
fcl.config().put('accessNode.api', apiUrl);


async function main() {

  const credential = new DefaultAzureCredential();

  // Use ClientSecretCredential if don't want to use DefaultAzureCredential

  // const credential = new ClientSecretCredential(
  //   <tenant-id>,
  //   <client-id>,
  //   <client-secret>
  // );

  // Create an instance of the authorizer
  const authorizer = new AzureVaultAuthorizer(
    credential, keyId, keyName, keyVaultUrl
  );

  // account address to use. To create a new account, Use the public key to 
  // create a new account in emulator or testnet. To create a new account using public key, use 
  // 'flow accounts create --key=<hex-encoded-public-key>'. use '--network=testnet' to create account on testnet  
  const address = '01cf0e2f2f715450';
  const keyIndex = 0;


  // Sign and send transactions with Azure Vault
  const authorization = authorizer.authorize(address, keyIndex);

  const response = await fcl.send([
    fcl.transaction`${transaction}`,
    fcl.args([]),
    fcl.proposer(authorization),
    fcl.authorizations([authorization]),
    fcl.payer(authorization),
    fcl.limit(9999),
  ]);
  await fcl.tx(response).onceSealed();

  console.log('Transaction Succeeded');
}

main().catch(e => console.error(e));