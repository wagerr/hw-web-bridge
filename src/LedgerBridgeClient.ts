import EventEmitter from 'events';
import {
    ClientAppRequest,
    ClientRequest,
    BridgeRequest,
    BridgeResponse,
    LOG_PREFIX_CLIENT
} from './types';
import { getReplySignature, fromHexToBufferPayload, fromBufferToHexPayload, browserInstance } from './utils';

export class LedgerBridgeClient {
    private _connected = false;
    private _onConnect?: () => void | Promise<void>;
    private _onTransportCreated?: () => void | Promise<void>;
    private _onDisconnect?: (error: string) => void | Promise<void>;
    private _onTransportDisconnected?: () => void | Promise<void>;

    public get connected() : boolean {
        return this._connected;
    }
    
    constructor(
        private emiter: EventEmitter,
        private messageTimeout: number = 30000
    ) {
    }

    onMessageListener(port: chrome.runtime.Port): void {
        port.onDisconnect.addListener(() => {
            this._connected = false;
            this.emiter.emit('PortDisconnected', browserInstance.runtime.lastError?.message);
        })
        port.onMessage.addListener((message: BridgeRequest | BridgeResponse) => {
            if (message && message.action) {
                this.emiter.emit(message.action, message);
                console.log(LOG_PREFIX_CLIENT, 'onMessage', message);
            }
        });
        this.emiter.on('ClientSendMessage', msg => {
            console.log(LOG_PREFIX_CLIENT, 'ClientSendMessage', msg);
            port.postMessage(msg)
        });

        this.emiter.on('PortConnected', () => {
            this._connected = true;
            console.log(LOG_PREFIX_CLIENT, 'PortConnected');
            this._onConnect();
        });

        this.emiter.on('PortDisconnected', (error: string) => {
            this._connected = false;
            console.log(LOG_PREFIX_CLIENT, 'PortDisconnect', error);
            this._onDisconnect(error);
        });

        this.emiter.on('TransportCreated', () => {
            console.log(LOG_PREFIX_CLIENT, 'TransportCreated');
            this._onTransportCreated();
        });

        this.emiter.on('TransportDisconnected', () => {
            console.log(LOG_PREFIX_CLIENT, 'TransportDisconnected');
            this._onTransportDisconnected();
        });
    }

    onConnect(listener: () => void | Promise<void>): this {
        this._onConnect = listener;
        return this;
    }

    onTransportCreated(listener: () => void | Promise<void>): this {
        this._onTransportCreated = listener;
        return this;
    }

    onTransportDisconnected(listener: () => void | Promise<void>): this {
        this._onTransportDisconnected = listener;
        return this;
    }

    onDisconnect(listener: (error: string) => void | Promise<void>): this {
        this._onDisconnect = listener
        return this;
    }

    async sendMessage<T>(message: ClientAppRequest | ClientRequest): Promise<T> {
        if (!this._connected) {
            throw new Error('The bridge is not connected');
        }
        const replySignature = getReplySignature(message);
        let responded = false;

        return new Promise((resolve, reject) => {
            const listener = async (request: BridgeResponse) => {
                const {
                    action,
                    success,
                    payload
                } = request;
                if (replySignature === action) {
                    console.log(LOG_PREFIX_CLIENT, 'sendMessage::response', request);
                    responded = true
                    this.emiter.removeListener(replySignature, listener)
                    if (success) {
                        resolve(
                            fromHexToBufferPayload(payload)
                        )
                    } else {
                        const error = new Error(
                            payload.message
                        )
                        error.stack = payload.stask
                        error.name = payload.name
                        reject(error)
                    }
                }
            }

            this.emiter.once(replySignature, listener);
            setTimeout(() => {
                if (!responded) {
                    this.emiter.removeListener(replySignature, listener)
                    reject(new Error(
                        `Timeout calling the hw bridge: ${replySignature}`
                    ));
                }
            }, this.messageTimeout);

            this.emiter.emit('ClientSendMessage', {
                ...message,
                payload: fromBufferToHexPayload(message.payload)
            })
        });
    }
}