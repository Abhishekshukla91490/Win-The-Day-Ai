const { supabase } = require("../config/supabase");

const getProgress = async (req, res) => {
  const user_id = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const { data: todayTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user_id)
      .eq("due_date", today);

    const { data: todayProofs } = await supabase
      .from("proofs")
      .select("*")
      .eq("user_id", user_id)
      .gte("submitted_at", today);

    const { data: scoreHistory } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user_id)
      .order("score_date", { ascending: false })
      .limit(7);

    const { data: streak } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user_id)
      .single();

    const { data: allTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user_id);

    const { data: allProofs } = await supabase
      .from("proofs")
      .select("*")
      .eq("user_id", user_id);

    const totalTasks = allTasks?.length || 0;
    const completedTasks =
      allTasks?.filter((t) => t.status === "completed").length || 0;
    const verifiedProofs =
      allProofs?.filter((p) => p.ai_verified === true).length || 0;
    const todayScore = scoreHistory?.[0]?.score_percent || 0;

    res.status(200).json({
      message: "Progress fetched!",
      dashboard: {
        today: {
          date: today,
          tasks_total: todayTasks?.length || 0,
          tasks_completed:
            todayTasks?.filter((t) => t.status === "completed").length || 0,
          score_percent: todayScore,
          proofs_submitted: todayProofs?.length || 0,
        },
        streak: {
          current: streak?.current_streak || 0,
          longest: streak?.longest_streak || 0,
          last_active: streak?.last_active_date || null,
        },
        overall: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
          verified_proofs: verifiedProofs,
        },
        score_history: scoreHistory || [],
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Progress fetch nahi hua: " + error.message });
  }
};

module.exports = { getProgress };
