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

    // 1) Get the participant (name + user id)
    const r = await fetch(`https://meet.googleapis.com/v2/${participantName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const participant = await r.json();

    let name = "Unknown User";
    let email = null;
    let userId = null;

    if (participant?.signedinUser) {
      name = participant.signedinUser.displayName || name;
      userId = participant.signedinUser.user; // "users/102678972519057276983"

      // 2) Resolve email in REAL TIME via People API
      const personId = userId.split("/")[1]; // -> "102678972519057276983"
      const peopleUrl =
        `https://people.googleapis.com/v1/people/${personId}` +
        `?personFields=names,emailAddresses` +
        `&sources=READ_SOURCE_TYPE_PROFILE` +
        `&sources=READ_SOURCE_TYPE_CONTACT` +
        `&sources=READ_SOURCE_TYPE_OTHER_CONTACT`;

      const pr = await fetch(peopleUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const person = await pr.json();

      if (pr.ok) {
        email = person?.emailAddresses?.[0]?.value || null;
        name = person?.names?.[0]?.displayName || name;
      } else {
        console.log("People API error:", JSON.stringify(person));
      }
    } else if (participant?.anonymousUser) {
      name = participant.anonymousUser.displayName || name; // no email possible
    } else if (participant?.phoneUser) {
      name = participant.phoneUser.displayName || name; // no email possible
    }

    console.log(`${name} (${email || "no email"}) joined the room`);
  } catch (err) {
    console.log("Error:", err.message);
  }
});

app.listen(process.env.PORT || 3000);