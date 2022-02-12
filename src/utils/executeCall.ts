import Transport from '@ledgerhq/hw-transport'
import { fromHexToBufferPayload, fromBufferToHexPayload } from '.'
import { ExecutionMode, MessagePayload } from '../types'
import BTCApp from '@ledgerhq/hw-app-btc'
import WGRApp from '@ledgerhq/hw-app-btc'
import ETHApp from '@ledgerhq/hw-app-eth'

export const executeCall = async (
  action: string,
  mode: ExecutionMode,
  executor: Transport | ETHApp | BTCApp | WGRApp ,
  payload: MessagePayload): Promise<any> => {
  let result = null
  const parsedInput = fromHexToBufferPayload(payload)
  console.log('::::::::executeCall:::::::::')
  const _executor = executor as any

  switch (mode) {
    case ExecutionMode.Prop:
      result = _executor[action].bind(_executor)
      break
    case ExecutionMode.Sync:
      result = _executor[action].bind(_executor)(...parsedInput)
      break
    case ExecutionMode.Async:
      result = await _executor[action].bind(executor)(...parsedInput)
      break
    default:
      break
  }

  return fromBufferToHexPayload(result)
}
