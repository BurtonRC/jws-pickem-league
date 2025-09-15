// src/context/CommentsContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

// Create context
const CommentsContext = createContext();

// Custom hook
export function useComments() {
  return useContext(CommentsContext);
}

// Provider
export function CommentsProvider({ children }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const commentsEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

// Helper: fetch reactions and merge into comments
const mergeReactions = async (baseComments) => {
  if (!baseComments.length) return baseComments;

  const commentIds = baseComments.map((c) => c.id);

  // Fetch all reactions for these comments
  const { data: reactions, error: reactionError } = await supabase
    .from("comment_reactions")
    .select("*")
    .in("comment_id", commentIds);

  if (reactionError) {
    console.error("Error fetching reactions:", reactionError);
  }

  // Build counts per comment in JS
  const countsMap = {}; // { commentId: { reactionType: count } }
  reactions?.forEach((r) => {
    if (!countsMap[r.comment_id]) countsMap[r.comment_id] = {};
    countsMap[r.comment_id][r.reaction_type] =
      (countsMap[r.comment_id][r.reaction_type] || 0) + 1;
  });

  // Get current user's reactions
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userReactions = [];
  if (user) {
    const { data: urData, error: urError } = await supabase
      .from("comment_reactions")
      .select("comment_id, reaction_type")
      .eq("user_id", user.id)
      .in("comment_id", commentIds);

    if (urError) console.error("Error fetching user reactions:", urError);
    userReactions = urData ?? [];
  }

  // Merge counts + userReaction into each comment
  return baseComments.map((c) => {
    const counts = countsMap[c.id] || {};
    const userReaction = userReactions.find((ur) => ur.comment_id === c.id);

    return {
      ...c,
      reactionCounts: counts,
      userReaction: userReaction?.reaction_type ?? null,
    };
  });
};


  // Fetch all comments from the view
  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments_with_username")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const merged = await mergeReactions(data);
      setComments(merged);
      scrollToBottom();
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new comment
  const addComment = async (userId, content, parentCommentId = null) => {
  try {
    const { data: insertedComment, error: insertError } = await supabase
      .from("comments")
      .insert([{ user_id: userId, content, parent_comment_id: parentCommentId }])
      .select("*")
      .single();

    if (insertError) throw insertError;

    // Fetch from view to get username
    const { data, error: fetchError } = await supabase
      .from("comments_with_username")
      .select("*")
      .eq("id", insertedComment.id)
      .single();

    if (fetchError) throw fetchError;

    setComments((prev) => [...prev, data]);
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.error("Error adding comment:", err);
  }
};

  // Update a single comment in state (for optimistic updates)
  const updateComment = (commentId, updateFn) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? updateFn(c) : c))
    );
  };

  useEffect(() => {
    fetchComments();

    // Realtime subscription for new inserts
    const subscription = supabase
      .channel("comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        async (payload) => {
          try {
            const { data, error } = await supabase
              .from("comments_with_username")
              .select("*")
              .eq("id", payload.new.id)
              .single();
            if (error) throw error;

            // Merge reactions with defaults
            const merged = await mergeReactions([data]);
            const withDefaults = {
              ...merged[0],
              reactionCounts: merged[0]?.reactionCounts ?? {},
              userReaction: merged[0]?.userReaction ?? null,
            };

            setComments((prev) => [...prev, withDefaults]);
            scrollToBottom();
          } catch (err) {
            console.error("Error fetching new comment:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <CommentsContext.Provider
      value={{
        comments,
        addComment,
        loading,
        commentsEndRef,
        fetchComments,
        updateComment, // exposed for optimistic updates
      }}
    >
      {children}
    </CommentsContext.Provider>
  );
}
