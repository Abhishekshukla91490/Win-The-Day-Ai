const supabase = require("../config/supabase");

const submitProof = async (req, res) => {
  const { task_id, proof_text, proof_url } = req.body;
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("proofs")
    .insert([{ user_id, task_id, proof_text, proof_url }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: "Proof submitted!", proof: data[0] });
};

const getProofs = async (req, res) => {
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from("proofs")
    .select("*, tasks(title)")
    .eq("user_id", user_id)
    .order("submitted_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ proofs: data });
};

module.exports = { submitProof, getProofs };
