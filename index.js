const express = require("express");

const app = express();

app.use(express.json());

app.post("/events", (req, res) => {

  const participant =
    req.body?.participant?.user?.displayName ||
    req.body?.participant?.name ||
    "Unknown User";

  // Log once when event arrives
  console.log(`${participant} joined the room`);

  console.log(req.body);

  // Log once after 3 minutes
  setTimeout(() => {
    console.log(`3 MINUTES PASSED for ${participant}`);
  }, 180000);

  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});