const { supabase } = require("../config/supabase");

const getLeaderboard = async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split("T")[0];

    const { data: weeklyScores } = await supabase
      .from("scores")
      .select("user_id, score_percent, score_date")
      .gte("score_date", weekAgo)
      .order("score_percent", { ascending: false });

    const { data: topStreaks } = await supabase
      .from("streaks")
      .select("user_id, current_streak, longest_streak")
      .order("current_streak", { ascending: false })
      .limit(10);

    const userScores = {};
    weeklyScores?.forEach((score) => {
      if (!userScores[score.user_id]) {
        userScores[score.user_id] = {
          user_id: score.user_id,
          total_score: 0,
          days_active: 0,
        };
      }
      userScores[score.user_id].total_score += score.score_percent;
      userScores[score.user_id].days_active += 1;
    });

    const leaderboard = Object.values(userScores)
      .map((u) => ({
        user_id: u.user_id,
        avg_score: Math.round(u.total_score / u.days_active),
        days_active: u.days_active,
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 10);

    res.status(200).json({
      message: "Leaderboard fetched!",
      leaderboard: {
        weekly_top: leaderboard,
        top_streaks: topStreaks || [],
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Leaderboard fetch nahi hua: " + error.message });
  }
};

module.exports = { getLeaderboard };
