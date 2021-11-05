import Transport from '@ledgerhq/hw-transport';
import { LedgerBridgeMessageHandler } from './';
import { browserInstance } from './utils';

export class BridgeManager {
    private _connected = false;
    private _transport?: Transport;
    private _port?: chrome.runtime.Port;
    private _messageHandlder?: LedgerBridgeMessageHandler;
    constructor(private extensionId: string) {
    }

    public get connected() : boolean {
        return this._connected;
    }
    
    createPort(onDisconnect?: (error?: Error) => void | Promise<void>): void {
        this._port = browserInstance.runtime.connect(this.extensionId, {
            name: 'ledger-bridge'
        });
        const disconnectListener = (port: chrome.runtime.Port) => {
            console.error(
              'onDisconnect',
              browserInstance.runtime.lastError?.message,
              port.name
            );
            this._connected = false;
            if (onDisconnect) {
                onDisconnect(new Error(browserInstance.runtime.lastError?.message))
            }
        }
        this._port.onDisconnect.addListener(disconnectListener.bind(this))
        this._port.postMessage({
            action: 'PortConnected'
        });
        this._connected = true;
    }

    tryCreateBridge(transport: Transport, onTransportDisconnect?: (error?: Error) => void | Promise<void>): void {
        this._transport = transport;
        this._transport.on('disconnect', (error?: Error) => {
            console.error('Transport disconnected', error);
            this._port?.postMessage({ action: 'TransportDisconnected' })
            if (onTransportDisconnect) {
                onTransportDisconnect(error);
            }
        })
        try {
            this._messageHandlder = new LedgerBridgeMessageHandler(this._port, this._transport);
            this._port?.postMessage({ action: 'TransportCreated' });
            this._messageHandlder.startListener();  
            this._connected = true;
        } catch (error) {
            this._connected = false;
            throw error;
        }
    }
}