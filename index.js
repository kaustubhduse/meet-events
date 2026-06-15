const express = require("express");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(express.json());

const oauth2 = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

app.get("/", (_req, res) => res.send("meet-events webhook alive"));

app.post("/events", async (req, res) => {
  res.status(200).send("OK");

  try {
    const decoded = JSON.parse(
      Buffer.from(req.body.message.data, "base64").toString()
    );

    const sessionName = decoded?.participantSession?.name;
    if (!sessionName) return;

    const participantName = sessionName.split("/participantSessions/")[0];

    const { token } = await oauth2.getAccessToken();
    const r = await fetch(`https://meet.googleapis.com/v2/${participantName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const participant = await r.json();

    const name =
      participant?.signedinUser?.displayName ||
      participant?.anonymousUser?.displayName ||
      participant?.phoneUser?.displayName ||
      "Unknown User";

    console.log(`${name} joined the room`);
  } catch (err) {
    console.log("Error:", err.message);
  }
});

app.listen(process.env.PORT || 3000);