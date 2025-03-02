export function createWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  console.log("Connecting to WebSocket at:", wsUrl);

  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  return socket;
}

export function sendChatMessage(socket: WebSocket, message: any) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "chat",
      data: message
    }));
  }
}