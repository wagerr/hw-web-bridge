import { ChainId } from "@liquality/cryptoassets";
import { ClientRequest } from "./";
import { Network } from "./index";

export interface ClientAppRequest extends ClientRequest {
    network: Network;
    chainId: ChainId;
}
