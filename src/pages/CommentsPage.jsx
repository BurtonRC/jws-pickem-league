import { useState, useRef, useEffect } from "react";
import { useComments } from "../context/CommentsContext";

export default function CommentsPage({ user }) {
  const { comments, addComment, loading, commentsEndRef } = useComments();
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
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
      )}
    </main>
  );
}
