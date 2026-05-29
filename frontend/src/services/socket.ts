const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export function connectLiveFeed(onMessage: (message: any) => void) {
  const socketUrl = API_BASE.replace('http', 'ws') + '/ws/live';
  const socket = new WebSocket(socketUrl);

  socket.onmessage = (event) => {
    onMessage(JSON.parse(event.data));
  };

  return () => socket.close();
}