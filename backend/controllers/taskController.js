const { supabase } = require("../config/supabase");

const createTask = async (req, res) => {
  const { title, description, category, due_date } = req.body;
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("tasks")
    .insert([{ user_id, title, description, category, due_date }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: "Task created!", task: data[0] });
};

const getTasks = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ tasks: data });
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const { status, title, description } = req.body;
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("tasks")
    .update({ status, title, description })
    .eq("id", id)
    .eq("user_id", user_id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Task updated!", task: data[0] });
};

const deleteTask = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Task deleted!" });
};

module.exports = { createTask, getTasks, updateTask, deleteTask };
