/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export function fromHexToBufferPayload(payload?: any): any {
    if (payload) {
        if (payload.type && payload.type === 'Hex') {
            return Buffer.from(payload.data || '', 'hex');
        }

        if (payload instanceof Array) {
            return payload.map(i => fromHexToBufferPayload(i));
        }

        if (typeof payload === 'object' && Object.keys(payload).length > 0) {
            const output: any = {};
            for (const key in payload) {
                output[key] = fromHexToBufferPayload(payload[key]);
            }
            return output;
        }
    }

    return payload;
}
