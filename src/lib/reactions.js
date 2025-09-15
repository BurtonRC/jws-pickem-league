import { supabase } from "../supabaseClient";

// Toggle reaction for a comment
export async function toggleReaction(commentId, userId, reactionType) {
  // Check if user already reacted
  const { data: existing, error } = await supabase
    .from("comment_reactions")
    .select("*")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking existing reaction:", error);
    return null;
  }

  if (!existing) {
    // Insert new reaction
    const { data, error: insertError } = await supabase
      .from("comment_reactions")
      .insert([{ comment_id: commentId, user_id: userId, reaction_type: reactionType }])
      .select()
      .single();

    if (insertError) console.error("Error inserting reaction:", insertError);
    return data;
  }

  if (existing.reaction_type === reactionType) {
    // Same reaction → remove it (toggle off)
    const { error: deleteError } = await supabase
      .from("comment_reactions")
      .delete()
      .eq("id", existing.id);

    if (deleteError) console.error("Error deleting reaction:", deleteError);
    return null;
  } else {
    // Update to new reaction
    const { data, error: updateError } = await supabase
      .from("comment_reactions")
      .update({ reaction_type: reactionType })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) console.error("Error updating reaction:", updateError);
    return data;
  }
}
