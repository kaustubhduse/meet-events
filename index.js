const express = require("express");

const app = express();

app.use(express.json());

app.post("/events", (req, res) => {

    setTimeout(() => {
      console.log("3 MINUTES PASSED");
    }, 180000);
  
    res.status(200).send("OK");
  
  });
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});