import { useState, useRef, useEffect, useMemo } from "react";
import { useComments } from "../context/CommentsContext";
import { useNavigate } from "react-router-dom";
import { toggleReaction } from "../lib/reactions";
import CommentText from "../components/CommentText";
import { supabase } from "../supabaseClient";
import radarIcon from "/public/images/radar/radar-256.png";

/*
 * First visual pass for the refreshed Comments page.
 *
 * Existing comment, reply, reaction, and CommentText behavior is preserved.
 * Radar-originated comments are visually identified from the existing
 * radar_player_user_id / radar_season fields already returned by the
 * comments view.
 */

function getInitials(username) {
  if (!username) return "?";

  const parts = username.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function parseTimestamp(ts) {
  if (!ts) return new Date(NaN);
  return new Date(ts.includes("T") ? ts : `${ts}Z`);
}

function formatTimestamp(ts) {
  const date = parseTimestamp(ts);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isThisWeek(ts) {
  const date = parseTimestamp(ts);

  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  // Calendar week: Monday through Sunday, using the browser's local time.
  const start = new Date(now);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysSinceMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return date >= start && date < end;
}

function flattenComments(items) {
  const result = [];

  const walk = (comment) => {
    result.push(comment);

    if (Array.isArray(comment.replies)) {
      comment.replies.forEach(walk);
    }
  };

  (items || []).forEach(walk);

  return result;
}

function SpeechBubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-[#1769e8]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-4.2A7.5 7.5 0 0 1 4.5 7.5 7.5 7.5 0 0 1 12 4h.5A7.5 7.5 0 0 1 20 11.5Z" />
    </svg>
  );
}

function RadarIcon() {
  return (
    <img
      src={radarIcon}
      alt=""
      className="h-11 w-11 shrink-0 object-contain"
      aria-hidden="true"
    />
  );
}

function UserAvatar({ username, radar = false }) {
  if (radar) return <RadarIcon />;

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#102b44] text-[12px] font-bold text-white"
      aria-hidden="true"
    >
      {getInitials(username)}
    </span>
  );
}

function ReactionButtons({ comment, onReact }) {
  const reactions = [
    ["like", "👍"],
    ["love", "❤️"],
    ["laugh", "😂"],
    ["wow", "😮"],
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {reactions.map(([type, icon]) => {
        const isActive = comment.userReaction === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onReact(comment.id, type)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-5 transition ${
              isActive
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            <span className="text-[12px] leading-none">{icon}</span>
            <span>{comment.reactionCounts?.[type] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReplyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-[#1769e8]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-4.2A7.5 7.5 0 0 1 4.5 7.5 7.5 7.5 0 0 1 12 4h.5A7.5 7.5 0 0 1 20 11.5Z" />
    </svg>
  );
}

function CommentMenuButton() {
  return (
    <button
      type="button"
      aria-label="Comment options"
      className="shrink-0 rounded-full px-2 py-1 text-lg leading-none text-[#102333] hover:bg-slate-100"
    >
      ···
    </button>
  );
}

export default function CommentsPage({ user }) {
  const {
    comments,
    addComment,
    loading,
    commentsEndRef,
    updateComment,
    fetchComments,
  } = useComments();

  const [newComment, setNewComment] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [expandedCommentIds, setExpandedCommentIds] = useState(
    () => new Set()
  );

  const textareaRef = useRef(null);
  const replyTextareaRef = useRef(null);
  const navigate = useNavigate();

  /*
   * Radar player names are looked up only for comments that already carry
   * Radar context. No comments-table behavior is changed.
   */
  const [radarPlayerNames, setRadarPlayerNames] = useState({});
  // Refresh the shared comments state when entering the Comments page.
  useEffect(() => {
    fetchComments();
  }, []);


  useEffect(() => {
    const playerIds = [
      ...new Set(
        flattenComments(comments)
          .map((comment) => comment.radar_player_user_id)
          .filter(Boolean)
      ),
    ];

    if (playerIds.length === 0) {
      setRadarPlayerNames({});
      return undefined;
    }

    let mounted = true;

    const loadRadarPlayerNames = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", playerIds);

      if (!mounted) return;

      if (error) {
        console.error("Radar player name lookup failed:", error);
        setRadarPlayerNames({});
        return;
      }

      const names = {};
      (data || []).forEach((profile) => {
        names[profile.id] = profile.username;
      });

      setRadarPlayerNames(names);
    };

    loadRadarPlayerNames();

    return () => {
      mounted = false;
    };
  }, [comments]);

  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;

    const resize = () => {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;

      if (textarea.scrollHeight > 200) {
        textarea.scrollTop =
          textarea.scrollHeight - textarea.clientHeight + 4;
      }
    };

    const frame = requestAnimationFrame(resize);

    return () => cancelAnimationFrame(frame);
  }, [newComment]);

  useEffect(() => {
    if (!replyTextareaRef.current) return;

    const textarea = replyTextareaRef.current;

    const resize = () => {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;

      if (textarea.scrollHeight > 150) {
        textarea.scrollTop =
          textarea.scrollHeight - textarea.clientHeight + 4;
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

  const handleReact = async (commentId, reactionType) => {
    updateComment(commentId, (comment) => {
      const newCounts = { ...comment.reactionCounts };
      let newReaction = reactionType;

      if (comment.userReaction === reactionType) {
        newReaction = null;
        newCounts[reactionType] =
          (newCounts[reactionType] || 1) - 1;

        if (newCounts[reactionType] <= 0) {
          delete newCounts[reactionType];
        }
      } else {
        if (comment.userReaction) {
          newCounts[comment.userReaction] =
            (newCounts[comment.userReaction] || 1) - 1;

          if (newCounts[comment.userReaction] <= 0) {
            delete newCounts[comment.userReaction];
          }
        }

        newCounts[reactionType] =
          (newCounts[reactionType] || 0) + 1;
      }

      return {
        ...comment,
        userReaction: newReaction,
        reactionCounts: newCounts,
      };
    });

    await toggleReaction(commentId, user.id, reactionType);
  };

  const allComments = useMemo(
    () => flattenComments(comments),
    [comments]
  );

  const totalComments = allComments.length;

  const weeklyComments = useMemo(
    () => allComments.filter((comment) => isThisWeek(comment.created_at)),
    [allComments]
  );

  const postsThisWeek = weeklyComments.length;

  const topPoster = useMemo(() => {
    const counts = new Map();

    weeklyComments.forEach((comment) => {
      const key = comment.user_id;

      if (!key) return;

      const current = counts.get(key) || {
        count: 0,
        username: comment.username || "Unknown",
        latest: 0,
      };

      current.count += 1;
      current.latest = Math.max(
        current.latest,
        parseTimestamp(comment.created_at).getTime() || 0
      );

      counts.set(key, current);
    });

    return [...counts.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.latest - a.latest;
    })[0] || null;
  }, [weeklyComments]);

  const toggleReplies = (commentId) => {
    setExpandedCommentIds((previous) => {
      const next = new Set(previous);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
  };

  const renderComment = (comment, isReply = false) => {
    const isRadar = Boolean(
      comment.radar_player_user_id && comment.radar_season
    );

    const radarPlayerName =
      radarPlayerNames[comment.radar_player_user_id] || "Radar Player";

    return (
      <div
        key={comment.id}
        className={`relative ${
          isReply
            ? "ml-8 border-l-2 border-slate-200 pl-4 sm:ml-12"
            : ""
        }`}
      >
        <div
          className={`rounded-xl border bg-white ${
            isRadar
              ? "border-cyan-300 bg-white"
              : "border-slate-200"
          }`}
        >
          <div className="flex gap-3 p-3 sm:p-4">
            <UserAvatar
              username={comment.username}
              radar={isRadar}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    {isRadar ? (
                      <>
                        <span className="text-[13px] font-bold text-[#102333]">
                          {comment.username || "Unknown"}
                        </span>
                        <span className="text-[13px] font-bold text-[#102333]">
                          to
                        </span>
                        <span className="text-[13px] font-bold text-[#102333]">
                          {radarPlayerName}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/league-radar", {
                              state: {
                                radarPlayerUserId: comment.radar_player_user_id,
                                radarSeason: comment.radar_season,
                              },
                            })
                          }
                          className="text-[13px] font-bold text-[#1769e8] hover:underline"
                          title={`Open ${radarPlayerName}'s Radar profile`}
                        >
                          Radar
                        </button>
                      </>
                    ) : (
                      <span className="text-[13px] font-bold text-[#102333]">
                        {comment.username || "Unknown"}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400">
                      · {formatTimestamp(comment.created_at)}
                    </span>
                  </div>
                </div>

                <CommentMenuButton />
              </div>

              <div className="mt-1 text-[14px] leading-6 text-[#102333]">
                <CommentText
                  username=""
                  content={comment.content}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ReactionButtons
                  comment={comment}
                  onReact={handleReact}
                />

                {Array.isArray(comment.replies) &&
                  comment.replies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleReplies(comment.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[12px] font-medium text-[#1769e8] hover:bg-blue-100"
                    >
                      <span aria-hidden="true">
                        {expandedCommentIds.has(comment.id) ? "×" : "›"}
                      </span>
                      {comment.replies.length}{" "}
                      {comment.replies.length === 1 ? "Reply" : "Replies"}
                    </button>
                  )}

                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-[#1769e8] hover:bg-blue-50"
                  onClick={() =>
                    setReplyingCommentId(
                      replyingCommentId === comment.id
                        ? null
                        : comment.id
                    )
                  }
                >
                  <ReplyIcon />
                  Reply
                </button>
              </div>

              {replyingCommentId === comment.id && (
                <form
                  onSubmit={(e) =>
                    handleReplySubmit(e, comment.id)
                  }
                  className="mt-3 flex flex-col gap-2"
                >
                  <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#102b44] text-[10px] font-bold text-white"
                      aria-hidden="true"
                    >
                      {getInitials(user?.user_metadata?.username)}
                    </span>

                    <textarea
                      ref={replyTextareaRef}
                      className="min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-sm text-[#102333] outline-none"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={1}
                      placeholder="Write a reply..."
                      style={{
                        maxHeight: "150px",
                        whiteSpace: "pre-line",
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                      }}
                    />

                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="shrink-0 rounded-lg bg-[#1769e8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {Array.isArray(comment.replies) &&
          comment.replies.length > 0 &&
          expandedCommentIds.has(comment.id) && (
            <div className="mt-2 space-y-2">
              {comment.replies.map((reply) =>
                renderComment(reply, true)
              )}
            </div>
          )}
      </div>
    );
  };

  return (
    <main className="min-h-screen w-full bg-[#f7f9fc] px-3 pb-10 pt-5 sm:px-5 sm:pt-7">
      <div className="mx-auto w-full max-w-[1080px]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#102333] sm:text-3xl">
                Comments
              </h2>

              <p className="mt-1 text-sm text-[#4b6475] sm:text-[15px]">
                Talk picks. Trash talk. Celebrate wins. This is your league,
                your conversation.
              </p>
            </div>
          </div>

          <div className="hidden pt-2 text-right sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#728797]">
              ENJOY THE GAMES ~ ENJOY THE SEASON
            </div>
            <div className="mt-2 ml-auto h-px w-44 bg-blue-300" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr]">
          <section className="order-1 lg:col-start-2 lg:row-start-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                <SpeechBubbleIcon />
                <h3 className="text-[15px] font-extrabold text-[#102333]">
                  Comments
                </h3>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-200 px-2 py-4">
                <div className="min-w-0 px-2 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-[#728797]">
                    Total Comments
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-[#102333]">
                    {totalComments}
                  </div>
                </div>

                <div className="min-w-0 px-2 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-[#728797]">
                    Posts This <br></br> Week
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-[#102333]">
                    {postsThisWeek}
                  </div>
                </div>

                <div className="min-w-0 px-2 text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-[#728797]">
                    Top Poster
                  </div>

                  <div className="mt-1 whitespace-normal break-words text-sm font-extrabold leading-tight text-[#102333]">
                    {topPoster?.username || "—"}
                  </div>

                  <div className="mt-0.5 text-[10px] text-[#728797]">
                    {topPoster
                      ? `${topPoster.count} ${
                          topPoster.count === 1
                            ? "comment"
                            : "comments"
                        }`
                      : "No posts this week"}
                  </div>
                </div>
              </div>
          </section>
          <section className="order-2 min-w-0 space-y-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
            >
              <div className="flex items-end gap-3">
                <UserAvatar
                  username={user?.user_metadata?.username}
                />

                <textarea
                  ref={textareaRef}
                  className="min-h-[42px] min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102333] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={1}
                  style={{
                    maxHeight: "200px",
                    whiteSpace: "pre-line",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                  }}
                />

                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="shrink-0 rounded-lg bg-[#1769e8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Post
                </button>
              </div>
            </form>

            {loading ? (
              <div className="flex min-h-32 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <p className="text-sm text-slate-500">
                  Loading comments...
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {comments
                  .filter((comment) => !comment.parent_comment_id)
                  .map((comment) => renderComment(comment))}

                <div ref={commentsEndRef} />
              </div>
            )}
          </section>

          <aside className="order-3 min-w-0 space-y-4 lg:col-start-2 lg:row-start-2">


            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">

                <h3 className="text-[15px] font-extrabold text-[#102333]">
                  Comment Etiquette
                </h3>
              </div>

              <div className="mt-3 space-y-2.5 text-[13px] text-[#304654]">
                {[
                  "Keep it fun.",
                  "Respect your fellow players.",
                  "Talk picks, not people.",
                  "No personal attacks.",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22a447] text-[12px] font-bold leading-none text-white"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl shadow-sm">
              <img
                src="/images/jwpl-banner-01.jpg"
                alt="Football stadium"
                className="block h-auto w-full"
              />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
