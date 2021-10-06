# fcl-azurevault-authorizer

Azure Vault authorizer (signer) for Flow blockchain.


## Installation

```bash
npm i fcl-azurevault-authorizer
```

## Usage 

```js

import * as fcl from '@onflow/fcl';
import { AzureVaultAuthorizer } from 'fcl-azurevault-authorizer';

// Key configuration. Store it in env variables or secret manager
const keyId = "https://<vault-name>.vault.azure.net/keys/<key-name>/xxxxxxxxxxxxxxxx";
const keyVaultUrl = 'https://<vault-name>.vault.azure.net';
const keyName = '<key-name>';


// Test transaction
const transaction = `
transaction {
  prepare(signer: AuthAccount) {
    log("Test transaction signed by fcl-azurevault-authorizer")
  }
}
`;

async function main() {

  // Create an instance of the authorizer
  const authorizer = new AzureVaultAuthorizer(
      keyId, keyName, keyVaultUrl
  );

  // address created using public key 
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
```

see `sign-tx.ts` in examples folder for complete example.

## Azure Vault setup

Note: In order to use fcl-azurevault-authorizer for remote key management, you'll need a Azure Platform account.

- Open the Azure portal. Select Key Vaults. 
- Create a new key vault. 
- Select **Settings**>**Keys**>**Generate**
- Select key type -> **EC**.
- Select Elliptic curve name -> **P-256**.
- create the key. After creation, select the created key to get more info. 
- Copy the **Key Identifier**, it will be used as `keyId` while initializing `AzureVaultAuthorizer`.

To be able to use it from backend code, use the following steps - 

1. first install azure-cli, az. You can find detailed steps <a href="https://docs.microsoft.com/en-us/cli/azure/install-azure-cli">here</a>. 

2. login to authenticate your account using `az login`.

3. Create a service principal to enable access to key vault resource - 
```bash
az ad sp create-for-rbac -n <your-application-name> --skip-assignment
```

Output : 
```json
{
  "appId": "generated-app-ID",
  "displayName": "dummy-app-name",
  "name": "http://dummy-app-name",
  "password": "random-password",
  "tenant": "tenant-ID"
}
```

4. Use the above returned credentials information to set **AZURE_CLIENT_ID**(appId), **AZURE_CLIENT_SECRET**(password) and **AZURE_TENANT_ID**(tenant) environment variables. The following example shows a way to do this in Bash:
```bash
  export AZURE_CLIENT_ID="generated-app-ID"
  export AZURE_CLIENT_SECRET="random-password"
  export AZURE_TENANT_ID="tenant-ID"
```

5. Grant the above mentioned application authorization to perform key operations on the keyvault:
```bash
az keyvault set-policy --name <your-key-vault-name> --spn $AZURE_CLIENT_ID --key-permissions backup create get import list sign verify
```

6. To verify the setup, use the above mentioned Key Vault name to retrieve details of your Vault which also contains your Key Vault URL:
```bash
az keyvault show --name <your-key-vault-name>
```


**Creating an account on testnet via the faucet:**

4. Get the public key using `authorizer.getPublicKey()`
5. Go to https://testnet-faucet-v2.onflow.org
6. Paste the copied public key in the form
7. **IMPORTANT**: Choose **SHA2_256** as the hash algorithm (_SHA3_256_ won't work with the key setup above)

Store the generated address and use it while creating the authorization - 
```js
const authorization = authorizer.authorize(accountAddress, keyIndex);
```

### Credits 
This fcl compatible Azure Vault authorizer is built taking inspiration from <a href="https://github.com/doublejumptokyo/fcl-kms-authorizer">fcl-kms-authorizer</a>