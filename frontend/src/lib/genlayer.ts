import { createClient } from 'genlayer-js'
import { localnet, studionet, testnetAsimov, testnetBradbury } from 'genlayer-js/chains'
import { ExecutionResult, TransactionStatus } from 'genlayer-js/types'
import { makeReportId, parseMultilineUrls, safeParseReport } from './helpers'
import type { AppConfig, FactReport, NetworkKey, VerifyFormState, VerifyResult } from './types'

const CHAINS: Record<NetworkKey, any> = {
  studionet,
  localnet,
  testnetBradbury,
  testnetAsimov,
}

export function getChain(network: NetworkKey) {
  return CHAINS[network]
}

export function getDefaultConfig(): AppConfig {
  const network = (import.meta.env.VITE_GENLAYER_NETWORK as NetworkKey | undefined) || 'studionet'
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS?.trim() || ''
  return { network, contractAddress }
}

export async function connectWallet() {
  const provider = (window as any).ethereum
  if (!provider) {
    throw new Error('MetaMask or another injected wallet was not found in this browser.')
  }
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  if (!accounts?.length) {
    throw new Error('No wallet account was returned by the provider.')
  }
  return { provider, address: accounts[0] }
}

export function createReadClient(network: NetworkKey) {
  return createClient({ chain: getChain(network) }) as any
}

export function createWriteClient(network: NetworkKey, address: string, provider: any) {
  return createClient({ chain: getChain(network), account: address as `0x${string}`, provider }) as any
}

export async function loadRecentReports(config: AppConfig, limit = 6) {
  if (!config.contractAddress) return [] as FactReport[]
  const client = createReadClient(config.network)
  const rawReports = (await client.readContract({
    address: config.contractAddress,
    functionName: 'get_recent_reports',
    args: [limit],
    stateStatus: 'accepted',
  })) as unknown[]

  return rawReports
    .map((item) => safeParseReport(item))
    .filter((item): item is FactReport => Boolean(item))
}

export async function readReport(config: AppConfig, reportId: string) {
  const client = createReadClient(config.network)
  const rawReport = (await client.readContract({
    address: config.contractAddress,
    functionName: 'get_report',
    args: [reportId],
    stateStatus: 'accepted',
  })) as unknown

  const parsed = safeParseReport(rawReport)
  if (!parsed) throw new Error('Could not parse the report returned by the contract.')
  return parsed
}

export async function submitVerification(
  config: AppConfig,
  wallet: { address: string; provider: any },
  form: VerifyFormState,
): Promise<VerifyResult> {
  if (!config.contractAddress) {
    throw new Error('Please set the deployed contract address first.')
  }

  const writeClient = createWriteClient(config.network, wallet.address, wallet.provider)
  const readClient = createReadClient(config.network)

  await writeClient.connect(config.network)

  const sourceUrls = parseMultilineUrls(form.sourceUrlsText)

  const txHash = (await writeClient.writeContract({
    address: config.contractAddress,
    functionName: 'submit_verification',
    args: [
      form.reportId || makeReportId(),
      form.contentType,
      form.claim,
      form.contentText,
      sourceUrls,
      form.notes,
      form.includeVisualCapture,
      new Date().toISOString(),
    ],
    value: BigInt(0),
  })) as string

  const receipt = await readClient.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    fullTransaction: false,
  })

  if (
    receipt?.txExecutionResultName &&
    receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN
  ) {
    throw new Error(`Transaction was accepted but execution did not finish successfully: ${receipt.txExecutionResultName}`)
  }

  const report = await readReport(config, form.reportId)
  return { txHash, report }
}
