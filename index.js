export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    server.accept();
    this.sessions.add(server);

    server.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ping") {
          server.send(JSON.stringify({ type: "pong" }));
          return;
        }

        const broadcastMessage = JSON.stringify({
          sender: data.sender || "Khách",
          message: data.message,
          time: new Date().toLocaleTimeString()
        });

        for (let s of this.sessions) {
          try {
            s.send(broadcastMessage);
          } catch (err) {
            this.sessions.delete(s);
          }
        }
      } catch (e) {}
    });

    server.addEventListener("close", () => this.sessions.delete(server));
    server.addEventListener("error", () => this.sessions.delete(server));

    return new Response(null, { status: 101, webSocket: client });
  }
}

const ALLOWED_ORIGIN = "https://cp.ssplay.net";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (url.pathname === "/chat") {
      if (origin !== ALLOWED_ORIGIN) {
        return new Response("Forbidden Origin", { status: 403 });
      }

      let id = env.CHAT_ROOM.idFromName("vltk-room");
      let stub = env.CHAT_ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response("VLTK Chat Server đang hoạt động!", { status: 200 });
  },
};
