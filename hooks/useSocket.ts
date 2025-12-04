import { useEffect } from 'react'
import { useSocketContext } from '@/components/SocketProvider'

export const useSocket = () => {
  const { socket, connected } = useSocketContext()

  useEffect(() => {
    return () => {
      // components should remove their own handlers; nothing global to cleanup here
    }
  }, [socket])

  return { socket, connected }
}

export default useSocket
