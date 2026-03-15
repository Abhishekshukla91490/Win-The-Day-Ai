const { supabase } = require("../config/supabase");

const getNotifications = async (req, res) => {
  const user_id = req.user.id;

  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    const { data: pendingTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user_id)
      .eq("due_date", today)
      .eq("status", "pending");

    const { data: streak } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user_id)
      .single();

    const { data: todayScore } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user_id)
      .eq("score_date", today)
      .single();

    const notifications = [];

    if (pendingTasks?.length > 0) {
      notifications.push({
        type: "warning",
        title: "Pending Tasks! ⚠️",
        message: `Aaj ke ${pendingTasks.length} tasks abhi bhi pending hain!`,
        tasks: pendingTasks.map((t) => t.title),
      });
    }

    if (streak && streak.last_active_date === yesterday && !todayScore) {
      notifications.push({
        type: "danger",
        title: "Streak Khatam Hone Wali Hai! 🔥",
        message: `Teri ${streak.current_streak} din ki streak khatam ho jaayegi! Aaj kaam karo!`,
      });
    }

    if (todayScore && todayScore.score_percent < 50) {
      notifications.push({
        type: "info",
        title: "Score Low Hai 📊",
        message: `Aaj ka score sirf ${todayScore.score_percent}% hai. Aur tasks complete karo!`,
      });
    }

    if (todayScore && todayScore.score_percent === 100) {
      notifications.push({
        type: "success",
        title: "Ekdum Mast! 🎉",
        message: "Aaj ke sabhi tasks complete! You Won The Day!",
      });
    }

    if (pendingTasks?.length === 0 && !todayScore) {
      notifications.push({
        type: "info",
        title: "Koi Task Nahi Aaj! 📋",
        message: "AI se aaj ka plan generate karo!",
      });
    }

    res.status(200).json({
      message: "Notifications fetched!",
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Notifications fetch nahi hui: " + error.message });
  }
};

module.exports = { getNotifications };
