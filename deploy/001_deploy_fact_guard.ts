import { readFileSync } from 'fs'
import path from 'path'
import type { DecodedDeployData, GenLayerChain, GenLayerClient, TransactionHash } from 'genlayer-js/types'
import { TransactionStatus } from 'genlayer-js/types'
import { testnetBradbury } from 'genlayer-js/chains'

export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), 'contracts/fact_guard.py')
  const contractCode = new Uint8Array(readFileSync(filePath))

  await client.initializeConsensusSmartContract()

  const deployTransaction = await client.deployContract({
    code: contractCode,
    args: [],
  })

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTransaction as TransactionHash,
    retries: 200,
  })

  if (
    receipt.statusName !== TransactionStatus.ACCEPTED &&
    receipt.statusName !== TransactionStatus.FINALIZED
  ) {
    throw new Error(`Deployment failed: ${JSON.stringify(receipt)}`)
  }

  const deployedContractAddress =
    (client.chain as GenLayerChain).id !== testnetBradbury.id
      ? receipt.data.contract_address
      : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress

  console.log('FactGuard deployed successfully', {
    transactionHash: deployTransaction,
    contractAddress: deployedContractAddress,
  })

  return deployedContractAddress
}
