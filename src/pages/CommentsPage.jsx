import { useState, useRef, useEffect } from "react";
import { useComments } from "../context/CommentsContext";
import { toggleReaction } from "../lib/reactions"; // <-- ensure this file exists

export default function CommentsPage({ user }) {
  const { comments, addComment, loading, commentsEndRef, updateComment } = useComments();
  const [newComment, setNewComment] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const textareaRef = useRef(null);
  const replyTextareaRef = useRef(null);

  // Auto-resize main comment textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const resize = () => {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = newHeight + "px";
      if (textarea.scrollHeight > 200) {
        textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight + 4;
      }
    };
    const frame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(frame);
  }, [newComment]);

  // Auto-resize reply textarea
  useEffect(() => {
    if (!replyTextareaRef.current) return;
    const textarea = replyTextareaRef.current;
    const resize = () => {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = newHeight + "px";
      if (textarea.scrollHeight > 150) {
        textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight + 4;
      }
    };
    const frame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(frame);
  }, [replyText]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(user.id, newComment.trim());
    setNewComment("");
  };

  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    await addComment(user.id, replyText.trim(), parentId);
    setReplyText("");
    setReplyingCommentId(null);
  };

  const parseTimestamp = (ts) => new Date(ts.includes("T") ? ts : ts + "Z");

  // Handle reaction toggle + optimistic UI update
  const handleReact = async (commentId, reactionType) => {
    updateComment(commentId, (c) => {
      const newCounts = { ...c.reactionCounts };
      let newReaction = reactionType;

      if (c.userReaction === reactionType) {
        newReaction = null;
        newCounts[reactionType] = (newCounts[reactionType] || 1) - 1;
        if (newCounts[reactionType] <= 0) delete newCounts[reactionType];
      } else {
        if (c.userReaction) {
          newCounts[c.userReaction] = (newCounts[c.userReaction] || 1) - 1;
          if (newCounts[c.userReaction] <= 0) delete newCounts[c.userReaction];
        }
        newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
      }

      return { ...c, userReaction: newReaction, reactionCounts: newCounts };
    });

    await toggleReaction(commentId, user.id, reactionType);
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
          rows={2}
          style={{ maxHeight: "200px" }}
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
          {comments
            .filter((c) => !c.parent_comment_id)
            .map((c) => (
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

                {/* Reply button */}
                <button
                  className="text-xs text-blue-600 hover:underline mt-1"
                  onClick={() =>
                    setReplyingCommentId(replyingCommentId === c.id ? null : c.id)
                  }
                >
                  Reply
                </button>

                {/* Reply form */}
                {replyingCommentId === c.id && (
                  <form
                    onSubmit={(e) => handleReplySubmit(e, c.id)}
                    className="mt-1 flex flex-col gap-1 ml-4"
                  >
                    <textarea
                      ref={replyTextareaRef}
                      className="w-full p-1 border rounded resize-none text-sm"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={1}
                      placeholder="Write a reply..."
                      style={{ maxHeight: "150px" }}
                    />
                    <button
                      type="submit"
                      className="self-end text-xs text-white bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Post
                    </button>
                  </form>
                )}

                {/* Render replies */}
                {c.replies?.map((r) => (
                  <div
                    key={r.id}
                    className="ml-4 mt-1 p-2 bg-gray-50 rounded-lg border-l-2 border-gray-300"
                  >
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">{r.username ?? "Unknown"}:</span>{" "}
                      {r.content}
                    </p>
                    <p className="text-xs text-gray-400">
                      {parseTimestamp(r.created_at).toLocaleString([], {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                    <ReactionButtons comment={r} user={user} onReact={handleReact} />
                  </div>
                ))}
              </div>
            ))}
          <div ref={commentsEndRef} />
        </div>
      )}
    </main>
  );
}
