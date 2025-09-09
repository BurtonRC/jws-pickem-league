import { useState } from "react";
import { useComments } from "../context/CommentsContext";

export default function CommentsPage({ user }) {
  const { comments, addComment, loading, commentsEndRef } = useComments();
  const [newComment, setNewComment] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(user.id, newComment.trim());
    setNewComment("");
  };

  return (
    <main className="w-full max-w-[800px] mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Comments</h2>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          className="flex-1 p-2 border rounded"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
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
                <span className="font-semibold">{c.user?.username ?? "Unknown"}:</span>{" "}
                {c.content}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(c.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
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
