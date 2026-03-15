const { supabase } = require("../config/supabase");

const getDashboard = async (req, res) => {
  try {
    const { data: users } = await supabase.from("profiles").select("*");
    const { data: allTasks } = await supabase.from("tasks").select("*");
    const { data: allProofs } = await supabase.from("proofs").select("*");
    const { data: allPlans } = await supabase.from("daily_plans").select("*");
    const { data: topScores } = await supabase
      .from("scores")
      .select("*, profiles(id)")
      .order("score_percent", { ascending: false })
      .limit(10);

    const today = new Date().toISOString().split("T")[0];
    const { data: todayTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("due_date", today);
    const { data: todayProofs } = await supabase
      .from("proofs")
      .select("*")
      .gte("submitted_at", today);

    res.status(200).json({
      message: "Admin dashboard fetched!",
      stats: {
        total_users: users?.length || 0,
        total_tasks: allTasks?.length || 0,
        total_proofs: allProofs?.length || 0,
        total_plans: allPlans?.length || 0,
        verified_proofs: allProofs?.filter((p) => p.ai_verified).length || 0,
        completed_tasks:
          allTasks?.filter((t) => t.status === "completed").length || 0,
        today: {
          tasks: todayTasks?.length || 0,
          proofs: todayProofs?.length || 0,
        },
        top_scorers: topScores || [],
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Admin dashboard fetch nahi hua: " + error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("profiles")
      .select(
        `*, tasks(count), proofs(count), streaks(current_streak, longest_streak)`,
      );

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: "Users fetch nahi hue: " + error.message });
  }
};

module.exports = { getDashboard, getAllUsers };
