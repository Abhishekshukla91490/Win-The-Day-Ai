const { supabase } = require("../config/supabase");

const updateScore = async (req, res) => {
  const user_id = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user_id)
      .eq("due_date", today);

    const total_tasks = tasks.length;
    const completed_tasks = tasks.filter(
      (t) => t.status === "completed",
    ).length;
    const score_percent =
      total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0;

    const { data: score, error } = await supabase
      .from("scores")
      .upsert(
        [
          {
            user_id,
            score_date: today,
            total_tasks,
            completed_tasks,
            score_percent,
          },
        ],
        { onConflict: "user_id,score_date" },
      )
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ message: "Score updated!", score: score[0] });
  } catch (error) {
    res.status(500).json({ error: "Score update nahi hua: " + error.message });
  }
};

const getScore = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", user_id)
    .order("score_date", { ascending: false })
    .limit(30);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ scores: data });
};

module.exports = { updateScore, getScore };
