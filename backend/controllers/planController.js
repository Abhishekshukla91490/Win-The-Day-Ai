const { supabase } = require("../config/supabase");

const createPlan = async (req, res) => {
  const { ai_generated_plan, plan_date } = req.body;
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("daily_plans")
    .insert([{ user_id, ai_generated_plan, plan_date }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: "Plan created!", plan: data[0] });
};

const getPlans = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("daily_plans")
    .select("*, tasks(*)")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ plans: data });
};

module.exports = { createPlan, getPlans };
