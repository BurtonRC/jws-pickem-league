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

  // Fetch all comments from the view
  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments_with_username")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data);
      scrollToBottom();
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new comment
  const addComment = async (userId, content) => {
    try {
      // Insert into original comments table
      const { data: insertedComment, error: insertError } = await supabase
        .from("comments")
        .insert([{ user_id: userId, content }])
        .select("*")
        .single();

      if (insertError) throw insertError;

      // Fetch the inserted comment from the view to get the username
      const { data, error: fetchError } = await supabase
        .from("comments_with_username")
        .select("*")
        .eq("id", insertedComment.id)
        .single();

      if (fetchError) throw fetchError;

      setComments((prev) => [...prev, data]);
      scrollToBottom();
    } catch (err) {
      console.error("Error adding comment:", err);
    }
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
            setComments((prev) => [...prev, data]);
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
      value={{ comments, addComment, loading, commentsEndRef }}
    >
      {children}
    </CommentsContext.Provider>
  );
}
