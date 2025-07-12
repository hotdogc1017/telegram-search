import type { ClientInstanceEventFromCore, ClientInstanceEventToCore } from './instance'
import type { SessionEventFromCore, SessionEventToCore } from './services'
import type { ConfigEventFromCore, ConfigEventToCore } from './services/config'
import type { ConnectionEventFromCore, ConnectionEventToCore } from './services/connection'
import type { DialogEventFromCore, DialogEventToCore } from './services/dialog'
import type { EntityEventFromCore, EntityEventToCore } from './services/entity'
import type { GramEventsEventFromCore, GramEventsEventToCore } from './services/gram-events'
import type { MessageEventFromCore, MessageEventToCore } from './services/message'
import type { StorageEventFromCore, StorageEventToCore } from './services/storage'
import type { TakeoutEventFromCore, TakeoutEventToCore } from './services/takeout'

import { createCoreContext } from '@tg-search/core-event'

export type FromCoreEvent = ClientInstanceEventFromCore
  & MessageEventFromCore
  & DialogEventFromCore
  & ConnectionEventFromCore
  & TakeoutEventFromCore
  & SessionEventFromCore
  & EntityEventFromCore
  & StorageEventFromCore
  & ConfigEventFromCore
  & GramEventsEventFromCore

export type ToCoreEvent = ClientInstanceEventToCore
  & MessageEventToCore
  & DialogEventToCore
  & ConnectionEventToCore
  & TakeoutEventToCore
  & SessionEventToCore
  & EntityEventToCore
  & StorageEventToCore
  & ConfigEventToCore
  & GramEventsEventToCore

createCoreContext()
