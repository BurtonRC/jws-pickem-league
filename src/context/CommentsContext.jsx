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
  // Removed auto-scroll to prevent jumping on new comments/replies
  // const scrollToBottom = () => {
  //   if (commentsEndRef.current) {
  //     commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
  //   }
  // };

// Helper: fetch reactions and merge into comments
const mergeReactions = async (baseComments) => {
  if (!baseComments.length) return baseComments;

  const commentIds = baseComments.map((c) => c.id);

  // Fetch all reactions for these comments
  const { data: reactionData, error: reactionError } = await supabase
    .from("comment_reactions")
    .select("comment_id, reaction_type")
    .in("comment_id", commentIds);

  if (reactionError) {
    console.error("Error fetching reaction counts:", reactionError);
  }

  // Aggregate counts in JS
  const countsMap = {};
  reactionData?.forEach((r) => {
    countsMap[r.comment_id] = countsMap[r.comment_id] || {};
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
      // Keep replies array for your replies system
      replies: [],
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

      // Build nested replies
      const nestedComments = [];
      const mapById = {};
      merged.forEach((c) => {
        mapById[c.id] = c;
        if (c.parent_comment_id) {
          const parent = mapById[c.parent_comment_id];
          if (parent) {
            parent.replies = parent.replies || [];
            // newest replies at the top
            parent.replies = [c, ...parent.replies];
          }
        } else {
          // newest top-level comments at the top
          nestedComments.unshift(c);
        }
      });

      setComments(nestedComments);

      // scrollToBottom(); // removed to stop page jumping
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new comment (supports replies)
  const addComment = async (userId, content, parentId = null) => {
    try {
      const { data: insertedComment, error: insertError } = await supabase
        .from("comments")
        .insert([{ user_id: userId, content, parent_comment_id: parentId }])
        .select("*")
        .single();

      if (insertError) throw insertError;

      // Fetch the inserted comment with username and reactions
      const { data, error: fetchError } = await supabase
        .from("comments_with_username")
        .select("*")
        .eq("id", insertedComment.id)
        .single();

      if (fetchError) throw fetchError;

      const mergedComment = (await mergeReactions([data]))[0];

      if (parentId) {
        // Add reply to parent comment (newest on top)
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [mergedComment, ...(c.replies || [])],
              };
            }
            return c;
          })
        );
      } else {
        // Add top-level comment (newest on top)
        setComments((prev) => [mergedComment, ...prev]);
      }

      // scrollToBottom(); // removed to prevent jumping
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // Update a single comment in state (used for optimistic reactions)
  const updateComment = (commentId, updateFn) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return updateFn(c);
        }
        // also check in replies
        if (c.replies?.length) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId ? updateFn(r) : r
            ),
          };
        }
        return c;
      })
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

            const mergedComment = (await mergeReactions([data]))[0];

            if (mergedComment.parent_comment_id) {
              setComments((prev) =>
                prev.map((c) => {
                  if (c.id === mergedComment.parent_comment_id) {
                    return {
                      ...c,
                      replies: [mergedComment, ...(c.replies || [])],
                    };
                  }
                  return c;
                })
              );
            } else {
              setComments((prev) => [mergedComment, ...prev]);
            }
            // scrollToBottom(); // removed
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
      value={{ comments, addComment, loading, commentsEndRef, fetchComments, updateComment }}
    >
      {children}
    </CommentsContext.Provider>
  );
}
