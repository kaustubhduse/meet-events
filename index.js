const express = require("express");
const { GoogleAuth } = require("google-auth-library");

const app = express();
app.use(express.json());

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/meetings.space.readonly"],
});

app.post("/events", async (req, res) => {
  res.status(200).send("OK"); // ACK immediately

  try {
    const decoded = JSON.parse(
      Buffer.from(req.body.message.data, "base64").toString()
    );

    const sessionName = decoded?.participantSession?.name;
    if (!sessionName) {
      console.log("No participantSession in payload:", decoded);
      return;
    }

    // participantSessions/.../ -> the parent participant resource
    const participantName = sessionName.split("/participantSessions/")[0];

    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;

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
    console.log(req.body);
  }
});

app.listen(process.env.PORT || 3000);