export function createWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = window.location.port || "5000";
  const wsUrl = `${protocol}//${host}:${port}/socket`;
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