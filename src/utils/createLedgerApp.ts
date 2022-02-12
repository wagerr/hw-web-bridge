import Transport from '@ledgerhq/hw-transport'
import { ChainId, isEthereumChain } from '@wagerr-wdk/cryptoassets'
import BTCApp from '@ledgerhq/hw-app-btc'
import WGRApp from '@ledgerhq/hw-app-btc'
import ETHApp from '@ledgerhq/hw-app-eth'

export const createLedgerApp = (
  chainId: ChainId,
  transport: Transport
): ETHApp | BTCApp | WGRApp | null => {
  if (chainId === ChainId.Bitcoin) {
    return new BTCApp(transport)
  } else if (chainId === ChainId.Wagerr) {
    return new WGRApp(transport)
  } else if (isEthereumChain(chainId)) {
    return new ETHApp(transport)
  }
  return null
}
