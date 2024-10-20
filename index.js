const express = require('express');
var cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const bodyParser = require('body-parser');
require('dotenv').config();
const eventRouter = require("./routes/events");
const announcementRouter = require("./routes/announcements");
const magazineRouter = require("./routes/magazine");
const adsRouter = require("./routes/ads");
const businessconnectRouter = require("./routes/businessconnect");
const userRouter = require("./routes/user");
const familydetailsRouter = require("./routes/familydetails");
const matrimonialRouter = require("./routes/matrimonial");
const authRouter = require("./routes/auth");
const forumRouter = require("./routes/forums");
const postRouter = require("./routes/posts");
const csvRouter = require("./routes/csvtodatabase");
const cityRouter = require("./routes/city");
const feedbackRouter = require("./routes/feedback");
const notificationRouter = require("./routes/notification");

const app = express();
const port = 3013;


app.use(cors());
// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.use("/apis", eventRouter);
app.use("/apis", announcementRouter);
app.use("/apis", magazineRouter);
app.use("/apis", adsRouter);
app.use("/apis", businessconnectRouter);
app.use("/apis", matrimonialRouter);
app.use("/apis", familydetailsRouter);
app.use("/apis", userRouter);
app.use("/apis", authRouter);
app.use("/apis", forumRouter);
app.use("/apis", csvRouter);
app.use("/apis",postRouter)
app.use("/apis",cityRouter)
app.use("/apis",feedbackRouter)
app.use("/apis",notificationRouter)

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});