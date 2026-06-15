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
    console.log("==================== NEW EVENT ====================");

    // 1) Raw Pub/Sub envelope (attributes + message metadata)
    console.log("--- Pub/Sub attributes ---");
    console.log(JSON.stringify(req.body?.message?.attributes, null, 2));
    console.log("messageId:", req.body?.message?.messageId);
    console.log("publishTime:", req.body?.message?.publishTime);

    // 2) Decoded event payload (what Workspace Events sent)
    const decoded = JSON.parse(
      Buffer.from(req.body.message.data, "base64").toString()
    );
    console.log("--- Decoded event payload ---");
    console.log(JSON.stringify(decoded, null, 2));

    const sessionName = decoded?.participantSession?.name;
    if (!sessionName) {
      console.log("No participantSession.name in payload");
      return;
    }
    console.log("participantSession.name:", sessionName);

    // Parent participant resource + the raw IDs in the path
    const participantName = sessionName.split("/participantSessions/")[0];
    const sessionId = sessionName.split("/participantSessions/")[1];
    const conferenceRecord = sessionName.split("/participants/")[0];
    const participantPathId = participantName.split("/participants/")[1];
    console.log("participant resource:", participantName);
    console.log("conferenceRecord:", conferenceRecord);
    console.log("participantPathId:", participantPathId);
    console.log("participantSessionId:", sessionId);

    // 3) Call the Meet API for the FULL participant object
    const { token } = await oauth2.getAccessToken();
    const r = await fetch(`https://meet.googleapis.com/v2/${participantName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const participant = await r.json();

    console.log("--- Meet API: full participant object ---");
    console.log("HTTP status:", r.status);
    console.log(JSON.stringify(participant, null, 2));

    // 4) Broken-out fields (whatever exists)
    let name = "Unknown User";
    let type = "unknown";
    let userId = null;
    let email = null; // Meet does not expose this; stays null

    if (participant?.signedinUser) {
      type = "signed-in";
      name = participant.signedinUser.displayName || name;
      userId = participant.signedinUser.user || null; // opaque ID, NOT an email
    } else if (participant?.anonymousUser) {
      type = "anonymous";
      name = participant.anonymousUser.displayName || name;
    } else if (participant?.phoneUser) {
      type = "phone";
      name = participant.phoneUser.displayName || name;
    }

    console.log("--- Extracted summary ---");
    console.log("name:", name);
    console.log("type:", type);
    console.log("userId (opaque):", userId);
    console.log("email:", email);
    console.log("earliestStartTime:", participant?.earliestStartTime);
    console.log("latestEndTime:", participant?.latestEndTime);
    console.log("participant.name:", participant?.name);
    console.log(`${name} joined the room`);
    console.log("===================================================");
  } catch (err) {
    console.log("Error:", err.message);
    console.log("Raw body:", JSON.stringify(req.body, null, 2));
  }
});

app.listen(process.env.PORT || 3000);