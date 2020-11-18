const express = require("express");
const app = express();
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const slug = require("slug");
const moment = require("moment");

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
const LocalStrategy = require("passport-local").Strategy;

let genid = 0;

const sequelize = require("./database.js");

const User = require("./user.js");
User.sync({ alter: true });

const Event = require("./event.js");
const { error } = require("console");
const { parse } = require("path");
Event.sync({ alter: true });

const SequelizeStore = require("connect-session-sequelize")(session.Store);
const format1 = "YYYY-MM-DD HH:mm:ss";

const sessionStore = new SequelizeStore({
  db: sequelize,
});
sessionStore.sync();

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser((email, done) => {
  User.findOne({ where: { email: email } }).then((user) => {
    done(null, user);
  });
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async function (email, password, done) {
      if (!email || !password) {
        done("Email and password required", null);
        return;
      }

      const user = await User.findOne({ where: { email: email } });

      if (!user) {
        done("User not found", null);
        return;
      }

      const valid = await user.isPasswordValid(password);

      if (!valid) {
        done("Email and password do not match", null);
        return;
      }

      done(null, user);
    }
  )
);

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "343ji43j4n3jn4jk3n", //enter a random string here
    resave: false,
    saveUninitialized: true,
    name: "walkoff",
    cookie: {
      secure: false, //CRITICAL on localhost
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    },
    store: sessionStore,
  }),
  passport.initialize(),
  passport.session()
);

app.get("/", (req, res) => {
  if (req.session.passport) {
    res.render("dashboard", { req });
  } else {
    res.render("index");
  }
});

app.use(express.json());

app.post("/api", async (req, res) => {
  let company = req["query"].company;
  Event.findAll({
    where: sequelize.where(
      sequelize.fn("lower", sequelize.col("orgname")),
      sequelize.fn("lower", company)
    ),
  }).then((dbevents) => {
    res.json({ message: JSON.stringify(dbevents) });
  });
});

// app.get("/api", async (req, res) => {
//   res.json({ message:  "as"});
// });

app.get("/events", (req, res) => {
  Event.findAll().then((dbevents) => {
    if (req.session.passport) {
      res.render("eventsl", { req, dbevents, sign });
    } else {
      res.render("events", { dbevents });
    }
  });
});

app.post("/events", (req, res) => {
  if (req.session.passport) {
    console.log(req);
    // sign(req.email,req.id);
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) =>
  req.session.passport ? res.redirect("/") : res.render("login")
);

app.get("/register", (req, res) =>
  req.session.passport ? res.redirect("/") : res.render("signup")
);

app.get("/add-events", (req, res) =>
  req.session.passport ? res.render("addevents", { req }) : res.render("login")
);

app.post("/login", async (req, res) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.render("error", { message: err });
    if (!user)
      return res.render("error", { message: "No user matching credentials" });

    req.login(user, (err) => {
      if (err) return res.render("error", { message: err });
      return res.redirect("/");
    });
  })(req, res);
});

const sign = async (email, eventid) => {
  const user = await User.findOne({ where: { email: email } });
  if (user.dataValues.signedEvents.includes(eventid)) {
    throw new Error("You have already signed this event!");
  } else {
    Event.findOne({ where: { primekey: eventid } }).then((event) => {
      event.update({ signtures: parseInt(event.signtures) + 1 });
      let nsignedEvents = [...user.dataValues.signedEvents, eventid];
      user.update({ signedEvents: nsignedEvents });
      console.log(event.signtures);
    });
  }
};

const unsign = async (email, eventid) => {
  const user = await User.findOne({ where: { email: email } });
  if (!user.dataValues.signedEvents.includes(eventid)) {
    throw new Error("You haven't signed this event!");
  } else {
    let nssignedEvents = [...user.dataValues.signedEvents];
    const index = nssignedEvents.indexOf(eventid);
    if (index > -1) {
      nssignedEvents.splice(index, 1);
    }
    user.update({signedEvents: nssignedEvents});

    Event.findOne({ where: { primekey: eventid } }).then((event) => {
      event.update({ signtures: parseInt(event.signtures) - 1 });
    });
  }
};

app.post("/add-events", async (req, res) => {
  if (req.session.passport) {
    const myobject = req["body"];
    const title = myobject["title"];
    const orgname = myobject["orgname"];
    const description = myobject["decription"];
    const place = myobject["where"];
    const time = myobject["time"];
    let p = title + '-' + orgname + '-' + time + '-' + (genid);
    const primekey = slug(p);
    genid++;
    try {
      const user = await Event.create({
        primekey,
        title,
        orgname,
        description,
        place,
        time,
      });
      sign(req.session.passport.user, primekey);
      return res.redirect("/");
    } catch (error) {
      res.statusCode = 500;
      let message = "An error occurred";
      res.render("error", { message });
    }
  } else {
    res.render("index");
  }
});

app.get("/logout", async (req, res) => {
  req.logout();
  req.session.destroy();
  return res.redirect("/");
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.create({ email, password });

    req.login(user, (err) => {
      if (err) return res.render("error", { message: err });
      return res.redirect("/");
    });
  } catch (error) {
    res.statusCode = 500;
    let message = "An error occurred";
    if (error.name === "SequelizeUniqueConstraintError") {
      message = "User already exists. Use login instead.";
    }
    res.render("error", { message });
  }
});

app.get("*", function (req, res) {
  let urls = req["originalUrl"].split("/");
  let message = "404, Page not found :(";
  if (urls[1] == "events") {
    Event.findOne({ where: { primekey: urls[2] } }).then((event) => {
      if (event == null) {
        message = "Event not found :(";
        res.render("error", { message });
      } else {
        if (urls.length > 3) {
          if (urls[3] == "sign") {
            if (req.session.passport) {
              sign(req.session.passport.user, urls[2])
                .then(() => {
                  res.json({ sigs: parseInt(event.signtures) + 1 });
                })
                .catch((error) => {
                  res.json({ sigs: parseInt(event.signtures) });
                  console.log("Already");
                });
            }
          } else if (urls[3] == "unsign") {
            if (req.session.passport) {
              unsign(req.session.passport.user, urls[2])
                .then(() => {
                  res.json({ sigs: parseInt(event.signtures) - 1 });
                })
                .catch((error) => {
                  res.json({ sigs: parseInt(event.signtures) });
                  console.log("Already");
                });
            }
          }
        } else {
          if (req.session.passport) {
            let status = false;
            res.render("detailssl", { req, event, moment, format1, status });
          } else {
            res.render("details", { event, moment, moment, format1 });
          }
        }
      }
    });
  } else {
    let message = "404, Page not found :(";
    res.render("error", { message });
  }
  console.log(urls);
});

app.listen(3001, () => console.log("Server ready"));
