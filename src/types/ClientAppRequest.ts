import { ChainId } from '@wagerr-wdk/cryptoassets'
import { ClientRequest, Network } from './'

export interface ClientAppRequest extends ClientRequest {
    network: Network;
    chainId: ChainId;
}
