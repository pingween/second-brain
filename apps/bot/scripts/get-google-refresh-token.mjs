// One-time helper: obtains a Google OAuth refresh token for the Worker.
// Usage:
//   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/get-google-refresh-token.mjs
// Then open the printed URL, sign in, and copy the refresh token it prints.
import http from "node:http";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.");
  process.exit(1);
}

const port = 53682;
const redirectUri = `http://127.0.0.1:${port}`;
const scope = "https://www.googleapis.com/auth/drive";

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
  });

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url ?? "/", redirectUri).searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Missing ?code");
    return;
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    res.writeHead(500).end("No refresh token returned – see terminal.");
    console.error(data);
  } else {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("Kész, visszamehetsz a terminálba.");
    console.log("\nGOOGLE_REFRESH_TOKEN=" + data.refresh_token + "\n");
  }
  server.close();
});

server.listen(port, "127.0.0.1", () => {
  console.log("Open this URL in your browser:\n\n" + authUrl + "\n");
});
