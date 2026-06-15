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

    // Figure out type + best-available identity
    let name = "Unknown User";
    let type = "unknown";
    let userId = null;       // opaque ID, only for signed-in users
    let email = null;        // almost always null — Meet does not expose it

    if (participant?.signedinUser) {
      type = "signed-in";
      name = participant.signedinUser.displayName || name;
      userId = participant.signedinUser.user || null; // opaque, NOT an email
    } else if (participant?.anonymousUser) {
      type = "anonymous";
      name = participant.anonymousUser.displayName || name;
    } else if (participant?.phoneUser) {
      type = "phone";
      name = participant.phoneUser.displayName || name;
    }

    console.log(`${name} joined the room`);
    console.log(`  type: ${type}, userId: ${userId}, email: ${email}`);
    // Tip: log the raw object once to see exactly what your accounts return:
    // console.log(JSON.stringify(participant));
  } catch (err) {
    console.log("Error:", err.message);
  }
});

app.listen(process.env.PORT || 3000);