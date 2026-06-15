const express = require("express");

const app = express();

app.use(express.json());

app.post("/events", (req, res) => {

  let participant = "Unknown User";

  try {

    const decoded = JSON.parse(
      Buffer.from(
        req.body.message.data,
        "base64"
      ).toString()
    );

    participant =
      decoded?.participant?.user?.displayName ||
      "Unknown User";

    console.log(`${participant} joined the room`);

    console.log(decoded);

  } 
  catch (err) {

    console.log("Failed to decode");

    console.log(req.body);

  }

  res.status(200).send("OK");
});

app.listen(process.env.PORT || 3000);