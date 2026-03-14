const Groq = require("groq-sdk");
const supabase = require("../config/supabase");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const generatePlan = async (req, res) => {
  const { goals, available_hours } = req.body;
  const user_id = req.user.id;

  if (!goals) {
    return res.status(400).json({ error: "Goals batao" });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a productivity coach. Generate a daily execution plan in JSON format with tasks. 
          Return ONLY valid JSON, no markdown, no backticks, just pure JSON like this:
          {
            "plan_summary": "brief summary",
            "tasks": [
              {
                "title": "task name",
                "description": "what to do",
                "category": "category",
                "estimated_hours": 1
              }
            ]
          }`,
        },
        {
          role: "user",
          content: `My goals for today: ${goals}. Available hours: ${available_hours || 3}`,
        },
      ],
    });

    const aiResponse = completion.choices[0].message.content;
    const cleanResponse = aiResponse.replace(/```json|```/g, "").trim();
    const planData = JSON.parse(cleanResponse);

    const { data: plan, error } = await supabase
      .from("daily_plans")
      .insert([
        {
          user_id,
          ai_generated_plan: cleanResponse,
          plan_date: new Date().toISOString().split("T")[0],
        },
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    const tasksToInsert = planData.tasks.map((task) => ({
      user_id,
      plan_id: plan[0].id,
      title: task.title,
      description: task.description,
      category: task.category,
      due_date: new Date().toISOString().split("T")[0],
    }));

    const { data: tasks } = await supabase
      .from("tasks")
      .insert(tasksToInsert)
      .select();

    res.status(201).json({
      message: "Plan generated!",
      plan: plan[0],
      tasks: tasks,
      ai_plan: planData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "AI plan generate nahi hua: " + error.message });
  }
};

module.exports = { generatePlan };
