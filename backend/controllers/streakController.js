const { supabase } = require("../config/supabase");

const updateStreak = async (req, res) => {
  const user_id = req.user.id;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  try {
    const { data: todayScore } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user_id)
      .eq("score_date", today)
      .single();

    if (!todayScore || todayScore.score_percent < 50) {
      return res.status(400).json({
        error:
          "Pehle aaj ka score update karo aur kam se kam 50% tasks complete karo!",
      });
    }

    const { data: existingStreak } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", user_id)
      .single();

    let current_streak = 1;
    let longest_streak = 1;

    if (existingStreak) {
      longest_streak = existingStreak.longest_streak;

      if (existingStreak.last_active_date === yesterday) {
        current_streak = existingStreak.current_streak + 1;
      } else if (existingStreak.last_active_date === today) {
        return res.status(200).json({
          message: "Streak already updated aaj ke liye!",
          streak: existingStreak,
        });
      } else {
        current_streak = 1;
      }

      longest_streak = Math.max(longest_streak, current_streak);
    }

    const { data: streak, error } = await supabase
      .from("streaks")
      .upsert(
        [
          {
            user_id,
            current_streak,
            longest_streak,
            last_active_date: today,
          },
        ],
        { onConflict: "user_id" },
      )
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({
      message: `🔥 ${current_streak} din ki streak!`,
      streak: streak[0],
    });
  } catch (error) {
    res.status(500).json({ error: "Streak update nahi hua: " + error.message });
  }
};

const getStreak = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ streak: data });
};

module.exports = { updateStreak, getStreak };
