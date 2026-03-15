const { supabase } = require("../config/supabase");

const signup = async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: "Email, password aur naam dalo" });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({ message: "Signup successful!", user: data.user });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email aur password dalo" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  res
    .status(200)
    .json({
      message: "Login successful!",
      token: data.session.access_token,
      user: data.user,
    });
};

module.exports = { signup, login };
