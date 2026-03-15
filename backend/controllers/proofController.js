const Groq = require("groq-sdk");
const { supabase } = require("../config/supabase");
const multer = require("multer");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

const SIMPLE_KEYWORDS = [
  "water",
  "walk",
  "steps",
  "mood",
  "expense",
  "budget",
  "sleep",
  "exercise",
  "meditation",
  "read",
  "drink",
  "eat",
  "wake",
  "journal",
];
const SIMPLE_CATEGORIES = [
  "mood",
  "health",
  "fitness",
  "daily",
  "lifestyle",
  "personal",
  "habit",
];

const isSimpleTask = (task) => {
  const title = task.title.toLowerCase();
  const category = (task.category || "").toLowerCase();
  return (
    SIMPLE_KEYWORDS.some((k) => title.includes(k)) ||
    SIMPLE_CATEGORIES.includes(category)
  );
};

const submitProof = async (req, res) => {
  const { task_id, proof_text, quiz_answers } = req.body;
  const user_id = req.user.id;

  if (!task_id || !proof_text) {
    return res
      .status(400)
      .json({ error: "task_id aur proof_text dono chahiye" });
  }

  try {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .eq("user_id", user_id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: "Task nahi mila" });
    }

    let aiResult;

    if (isSimpleTask(task)) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a friendly task verifier. For simple daily tasks like drinking water, walking, mood tracking etc, be lenient and accept honest answers.
            Return ONLY valid JSON:
            {
              "verified": true or false,
              "feedback": "encouraging message",
              "score": 0 to 100
            }`,
          },
          {
            role: "user",
            content: `Task: ${task.title}
            User's answer: ${proof_text}
            Is this a reasonable completion of this task?`,
          },
        ],
      });

      const response = completion.choices[0].message.content;
      const clean = response.replace(/```json|```/g, "").trim();
      aiResult = JSON.parse(clean);
    } else {
      if (!quiz_answers || quiz_answers.length === 0) {
        return res.status(400).json({
          error: "Quiz answers required!",
          need_quiz: true,
        });
      }

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a strict task verifier. Verify if the quiz answers prove the task was completed.
            Return ONLY valid JSON:
            {
              "verified": true or false,
              "feedback": "detailed reason",
              "score": 0 to 100
            }`,
          },
          {
            role: "user",
            content: `Task: ${task.title}
            Description: ${task.description || ""}
            User explanation: ${proof_text}
            Quiz Q&A: ${JSON.stringify(quiz_answers)}
            Did the user actually complete this task?`,
          },
        ],
      });

      const response = completion.choices[0].message.content;
      const clean = response.replace(/```json|```/g, "").trim();
      aiResult = JSON.parse(clean);
    }

    const { data: proof, error: proofError } = await supabase
      .from("proofs")
      .insert([
        {
          user_id,
          task_id,
          proof_text,
          proof_url: null,
          ai_verified: aiResult.verified,
          ai_feedback: aiResult.feedback,
        },
      ])
      .select();

    if (proofError) return res.status(400).json({ error: proofError.message });

    if (aiResult.verified) {
      await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", task_id);
    }

    res.status(201).json({
      message: "Proof submitted!",
      proof: proof[0],
      ai_result: aiResult,
    });
  } catch (error) {
    res.status(500).json({ error: "Proof submit nahi hua: " + error.message });
  }
};

const generateQuiz = async (req, res) => {
  const { task_id } = req.body;
  const user_id = req.user.id;

  try {
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .eq("user_id", user_id)
      .single();

    if (!task) return res.status(404).json({ error: "Task nahi mila" });

    const simple = isSimpleTask(task);

    if (simple) {
      return res.status(200).json({
        message: "Simple task!",
        task_id,
        task_title: task.title,
        questions: [],
        is_simple: true,
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Generate 2-3 verification questions for a task. Questions should prove if someone actually did the task.
          Return ONLY valid JSON:
          {
            "questions": [
              "question 1?",
              "question 2?",
              "question 3?"
            ]
          }`,
        },
        {
          role: "user",
          content: `Task: ${task.title}\nDescription: ${task.description || ""}`,
        },
      ],
    });

    const response = completion.choices[0].message.content;
    const clean = response.replace(/```json|```/g, "").trim();
    const quizData = JSON.parse(clean);

    res.status(200).json({
      message: "Quiz generated!",
      task_id,
      task_title: task.title,
      questions: quizData.questions,
      is_simple: false,
    });
  } catch (error) {
    res.status(500).json({ error: "Quiz generate nahi hua: " + error.message });
  }
};

const getProofs = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("proofs")
    .select("*, tasks(title, category)")
    .eq("user_id", user_id)
    .order("submitted_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ proofs: data });
};

module.exports = { submitProof, getProofs, generateQuiz, upload };
