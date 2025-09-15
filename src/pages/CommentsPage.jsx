import { useState, useRef, useEffect } from "react";
import { useComments } from "../context/CommentsContext";
import { toggleReaction } from "../lib/reactions"; // <-- ensure this file exists

export default function CommentsPage({ user }) {
  const { comments, addComment, loading, commentsEndRef, fetchComments, updateComment } = useComments();
  const [newComment, setNewComment] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea smoothly, including scrolling and cursor padding
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;

    const resize = () => {
      textarea.style.height = "auto"; // reset to allow shrinking
      const newHeight = Math.min(textarea.scrollHeight, 200); // respect maxHeight
      textarea.style.height = newHeight + "px";

      // Scroll to bottom if content exceeds maxHeight
      if (textarea.scrollHeight > 200) {
        textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight + 4; // 4px padding
      }
    };

    const frame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(frame);
  }, [newComment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(user.id, newComment.trim());
    setNewComment("");
  };

  const parseTimestamp = (ts) => new Date(ts.includes("T") ? ts : ts + "Z");

  // Handle reaction toggle + optimistic UI update
  const handleReact = async (commentId, reactionType) => {
  // Optimistic update
  updateComment(commentId, (c) => {
    const newCounts = { ...c.reactionCounts };
    let newReaction = reactionType;

    if (c.userReaction === reactionType) {
      // Toggle off
      newReaction = null;
      newCounts[reactionType] = (newCounts[reactionType] || 1) - 1;
      if (newCounts[reactionType] <= 0) delete newCounts[reactionType];
    } else {
      // Switching reactions
      if (c.userReaction) {
        newCounts[c.userReaction] = (newCounts[c.userReaction] || 1) - 1;
        if (newCounts[c.userReaction] <= 0) delete newCounts[c.userReaction];
      }
      newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
    }

    return { ...c, userReaction: newReaction, reactionCounts: newCounts };
  });

  // Update Supabase in the background
  await toggleReaction(commentId, user.id, reactionType);

  // ✅ Removed fetchComments() to stop full page reload
};


  // Reaction buttons component
  function ReactionButtons({ comment, user, onReact }) {
  const reactions = ["like", "love", "laugh", "wow"];
  const icons = { like: "👍", love: "❤️", laugh: "😂", wow: "😮" };

  return (
    <div className="flex gap-1 mt-1">
      {reactions.map((r) => {
        const isActive = comment.userReaction === r;
        return (
          <button
            key={r}
            onClick={() => onReact(comment.id, r)}
            className={`
              flex items-center text-xs gap-0.5 px-0.5 py-0.25 rounded
              ${isActive ? "text-blue-600" : "text-gray-600"}
              hover:text-blue-500
              transition-colors duration-150
            `}
          >
            <span className="text-sm">{icons[r]}</span>
            <span>{comment.reactionCounts?.[r] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}




  return (
    <main className="w-full max-w-[800px] mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Comments</h2>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          className="w-full p-2 border rounded resize-none overflow-y-auto transition-[height] duration-200 ease-out"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={2} // initial height
          style={{ maxHeight: "200px" }} // maximum height
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 self-end"
        >
          Post
        </button>
      </form>

      {loading ? (
        <p>Loading comments...</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="p-4 bg-gray-100 rounded-xl">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{c.username ?? "Unknown"}:</span>{" "}
                {c.content}
              </p>
              <p className="text-xs text-gray-400">
                {parseTimestamp(c.created_at).toLocaleString([], {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>

              {/* Reactions */}
              <ReactionButtons comment={c} user={user} onReact={handleReact} />
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
      )}
    </main>
  );
}
