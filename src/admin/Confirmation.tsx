import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const ConfirmationContext = createContext<(message: string) => Promise<boolean>>(async () => false)
export const useConfirmation = () => useContext(ConfirmationContext)
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const answer = useRef<((value: boolean) => void) | null>(null)
  useEffect(() => { if (message) dialog.current?.showModal(); else dialog.current?.close() }, [message])
  function finish(value: boolean) { answer.current?.(value); answer.current = null; setMessage('') }
  const confirm = (value: string) => new Promise<boolean>(resolve => { answer.current = resolve; setMessage(value) })
  return <ConfirmationContext.Provider value={confirm}>{children}<dialog className="cms-dialog" ref={dialog} onCancel={() => finish(false)} aria-labelledby="cms-confirm-title"><h2 id="cms-confirm-title">Confirm this change</h2><p>{message}</p><div><button className="cms-button" onClick={() => finish(false)}>Cancel</button><button className="cms-button cms-primary" onClick={() => finish(true)}>Confirm</button></div></dialog></ConfirmationContext.Provider>
}
