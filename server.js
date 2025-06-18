const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Admin credentials
const ADMIN_USERNAME = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";

// MongoDB Connection
const MONGODB_URI =
  "mongodb+srv://mobile-matrix:70HwXlRek2TQwutW@cluster0.qrdfd.mongodb.net/issues-management?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Issue Schema
const issueSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "Anonymous",
  },
  issue: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["sales", "operation"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Issue = mongoose.model("Issue", issueSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session middleware
app.use(
  session({
    secret: "issues-management-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  } else {
    return res.redirect("/admin/login");
  }
};

// Routes
// Public route - Home page with options
app.get("/", (req, res) => {
  res.render("index");
});

// Sales issue form
app.get("/sales-issue", (req, res) => {
  res.render("issue-form", { type: "sales", title: "Sales Issue" });
});

// Operation issue form
app.get("/operation-issue", (req, res) => {
  res.render("issue-form", { type: "operation", title: "Operation Issue" });
});

// Submit issue
app.post("/submit-issue", async (req, res) => {
  try {
    const { name, issue, type } = req.body;

    const newIssue = new Issue({
      name: name || "Anonymous",
      issue,
      type,
    });

    await newIssue.save();
    res.render("success", { type });
  } catch (error) {
    console.error("Error saving issue:", error);
    res.status(500).render("error", { message: "Error submitting issue" });
  }
});

// Admin login page
app.get("/admin/login", (req, res) => {
  res.render("admin-login", { error: null });
});

// Admin login POST
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect("/admin");
  } else {
    res.render("admin-login", { error: "Invalid username or password" });
  }
});

// Admin logout
app.get("/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/admin/login");
  });
});

// Admin dashboard (protected)
app.get("/admin", requireAuth, async (req, res) => {
  try {
    const filter = req.query.filter;
    let query = {};

    if (filter === "sales" || filter === "operation") {
      query.type = filter;
    }

    const issues = await Issue.find(query).sort({ createdAt: -1 });
    res.render("admin", { issues, currentFilter: filter || "all" });
  } catch (error) {
    console.error("Error fetching issues:", error);
    res
      .status(500)
      .render("error", { message: "Error loading admin dashboard" });
  }
});

// Delete issue (protected)
app.post("/admin/delete/:id", requireAuth, async (req, res) => {
  try {
    await Issue.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting issue:", error);
    res.redirect("/admin");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
