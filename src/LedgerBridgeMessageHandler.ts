import BTCApp from '@ledgerhq/hw-app-btc';
import ETHApp from '@ledgerhq/hw-app-eth';
import Transport from '@ledgerhq/hw-transport';
import { ChainId, isEthereumChain } from '@liquality/cryptoassets';
import {
    BridgeRequest, BridgeResponse, ClientAppRequest,
    ClientRequest, ExecutionMode, LOG_PREFIX, MessagePayload, RequestNamespace
} from './types';
import { fromBufferToHexPayload, fromHexToBufferPayload, getReplySignature } from './utils';

export class LedgerBridgeMessageHandler {
    constructor(
        private port: chrome.runtime.Port,
        private transport: Transport
    ) {
    }

    startListener(): void {
        this.port.onMessage.addListener(this.onMessage.bind(this));
    }

    sendMessage(message: BridgeRequest | BridgeResponse): void {
        console.log(LOG_PREFIX, 'Bridge::sendMessage', message);
        const namespace = message['namespace'] || 'Bridge';
        this.port.postMessage({
            ...message,
            namespace
        });
    }

    private async onMessage(message: ClientRequest): Promise<void> {
        console.log(LOG_PREFIX, 'Bridge::onMessage', message);
        try {
            switch (message.namespace) {
                case RequestNamespace.App:
                    await this.onAppMessage(message as ClientAppRequest);
                    break;
                case RequestNamespace.Transport:
                    await this.onTransportMessage(message);
                    break;
                default:
                    throw new Error('The namespace is required.')
            }
        } catch (error) {
            this.sendMessage({
                namespace: message.namespace,
                action: getReplySignature(message),
                success: false,
                payload: error
            });
        }
    }

    private  async onAppMessage(message: ClientAppRequest): Promise<void> {
        const { action, execMode, payload, chainId, namespace } = message;

        const app = this.createLedgerApp(this.transport, chainId);
        const reply = getReplySignature(message);
        const result = await this.executeCall(action, execMode, app, payload);

        this.sendMessage({
            namespace,
            action: reply,
            success: true,
            payload: result
        });
    }

    private  async onTransportMessage(message: ClientRequest): Promise<void> {
        const reply = getReplySignature(message);
        const { action, execMode, payload, namespace } = message;

        const result = await this.executeCall(
            action,
            execMode,
            this.transport,
            payload
        );
        this.sendMessage({
            namespace,
            action: reply,
            success: true,
            payload: result
        });
    }

    private  async executeCall(
        action: string, 
        mode: ExecutionMode, 
        executor: Transport | ETHApp | BTCApp, 
        payload: MessagePayload): Promise<any> {
        
        let result = null;

        const parsedInput = fromHexToBufferPayload(payload);
        const _executor = executor as any;
        console.log(LOG_PREFIX, 'executeCall', { action, mode, payload });
        
        switch (mode) {
            case ExecutionMode.Prop:
                result = _executor[action].bind(_executor);
                break;
            case ExecutionMode.Sync:
                result = _executor[action].bind(_executor)(...parsedInput);
                break;
            case ExecutionMode.Async:
                result = await _executor[action].bind(executor)(...parsedInput);
                break;
            default:
                break;
        }
    
        return fromBufferToHexPayload(result);
    }

    private  createLedgerApp (
        transport: Transport,
        chainId: ChainId
    ): ETHApp | BTCApp | null {
        if (chainId === ChainId.Bitcoin) {
            return new BTCApp(transport);
        } else if (isEthereumChain(chainId)) {
            return new ETHApp(transport);
        }
        return null;
    }
}