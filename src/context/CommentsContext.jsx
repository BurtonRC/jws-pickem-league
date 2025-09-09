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

  // Fetch all comments with username
  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user:user_id (
            username
          )
        `)
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
      const { data, error } = await supabase
        .from("comments")
        .insert([{ user_id: userId, content }])
        .select(`
          id,
          content,
          created_at,
          user:user_id (
            username
          )
        `)
        .single();

      if (error) throw error;
      setComments((prev) => [...prev, data]);
      scrollToBottom();
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    fetchComments();

    // Real-time subscription for inserts
    const subscription = supabase
      .channel("comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        async (payload) => {
          // Fetch full comment with username
          const { data, error } = await supabase
            .from("comments")
            .select(`
              id,
              content,
              created_at,
              user:user_id (
                username
              )
            `)
            .eq("id", payload.new.id)
            .single();
          if (!error && data) {
            setComments((prev) => [...prev, data]);
            scrollToBottom();
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
