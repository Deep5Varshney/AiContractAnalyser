const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "AI Contract Analyzer Backend is running!"
  });
});

// Temporary users storage
const users = [];

// Signup API
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  const existingUser = users.find(user => user.email === email);

  if (existingUser) {
    return res.status(409).json({
      message: "User already exists"
    });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password
  };

  users.push(newUser);

  res.status(201).json({
    message: "Account created successfully"
  });
});

// Login API
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    user => user.email === email && user.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }

  res.json({
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
});

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});