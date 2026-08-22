import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import PageHeader from "@/components/PageHeader";
import { GapCursor } from "@tiptap/pm/gapcursor";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

const DEFAULT_SEASON = 2026;

const getDraftKey = (season, week) =>
  `wednesday-report-draft-v2-${season}-${week}`;

const getSelectionKey = (type) =>
  `wednesday-report-${type}`;

export default function AdminWednesdayReportPage() {
  // ------------------------------------------------------------
  // SEASON / WEEK
  // ------------------------------------------------------------

  const [season, setSeason] = useState(() => {
    const savedSeason = localStorage.getItem(
      getSelectionKey("season")
    );

    return savedSeason
      ? Number(savedSeason)
      : DEFAULT_SEASON;
  });

  const [week, setWeek] = useState(() => {
    const savedWeek = localStorage.getItem(
      getSelectionKey("week")
    );

    return savedWeek
      ? Number(savedWeek)
      : 1;
  });

  // ------------------------------------------------------------
  // REPORT STATE
  // ------------------------------------------------------------

  const [reportDate, setReportDate] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [reports, setReports] = useState([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  const [savedVersion, setSavedVersion] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [status, setStatus] = useState("DRAFT");

  const initializingRef = useRef(false);
  const userEditingRef = useRef(false);
  const initializedKeyRef = useRef(null);

  // ------------------------------------------------------------
  // TIPTAP EDITOR
  // ------------------------------------------------------------

  const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [2, 3],
      },
    }),

    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
    }),

    Image.configure({
      inline: false,
      allowBase64: false,
      resize: {
        enabled: true,
        directions: [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ],
        minWidth: 100,
        minHeight: 100,
        alwaysPreserveAspectRatio: true,
      },
    }),

  ],

  content: "",

editorProps: {
  handleClick: (view, pos, event) => {
    const { state } = view;

    const coords = view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });

    if (!coords) {
      return false;
    }

    const $pos = state.doc.resolve(coords.pos);

    const nodeBefore = $pos.nodeBefore;
    const nodeAfter = $pos.nodeAfter;

    /*
     * If the click is immediately before or after an image,
     * place a real ProseMirror GapCursor there.
     *
     * Clicking directly on the image itself is left alone so
     * Tiptap's image selection/resizing continues to work.
     */
    if (nodeBefore?.type.name === "image") {
      const gapCursor = new GapCursor($pos);

      view.dispatch(
        state.tr.setSelection(gapCursor)
      );

      view.focus();

      return true;
    }

    if (nodeAfter?.type.name === "image") {
      const gapCursor = new GapCursor($pos);

      view.dispatch(
        state.tr.setSelection(gapCursor)
      );

      view.focus();

      return true;
    }

    return false;
  },
},

  onUpdate: ({ editor }) => {
    if (initializingRef.current) {
      return;
    }

    userEditingRef.current = true;

    setContent(editor.getHTML());
  },
});

  // ------------------------------------------------------------
  // REMEMBER SEASON / WEEK
  // ------------------------------------------------------------

  useEffect(() => {
    localStorage.setItem(
      getSelectionKey("season"),
      String(season)
    );

    localStorage.setItem(
      getSelectionKey("week"),
      String(week)
    );
  }, [season, week]);

  // ------------------------------------------------------------
  // LOAD REPORTS
  // ------------------------------------------------------------

  const loadReports = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("wednesday_reports")
        .select("*")
        .order("report_date", {
          ascending: false,
        });

      if (error) throw error;

      setReports(data || []);
      return data || [];
    } catch (err) {
      console.error(
        "Load Wednesday Reports error:",
        err
      );

      setError(
        err.message ||
          "Unable to load Wednesday Reports."
      );

      return [];
    } finally {
      setLoading(false);
      setReportsLoaded(true);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // ------------------------------------------------------------
  // FIND SAVED REPORT
  // ------------------------------------------------------------

  const findReportForWeek = (
    reportList,
    selectedSeason,
    selectedWeek
  ) => {
    return reportList.find((report) => {
      const reportYear = new Date(
        `${report.report_date}T00:00:00`
      ).getFullYear();

      return (
        reportYear === Number(selectedSeason) &&
        Number(report.week) === Number(selectedWeek)
      );
    });
  };

  // ------------------------------------------------------------
  // INITIALIZE REPORT
  // ------------------------------------------------------------

  useEffect(() => {
    if (!reportsLoaded || !editor) return;

    const currentKey = `${season}-${week}`;

    if (
      initializedKeyRef.current === currentKey
    ) {
      return;
    }

    initializedKeyRef.current = currentKey;

    initializingRef.current = true;
    userEditingRef.current = false;

    const existing = findReportForWeek(
      reports,
      season,
      week
    );

    let saved = null;

    if (existing) {
      saved = {
        id: existing.id,
        reportDate: existing.report_date || "",
        title: existing.title || "",
        content: existing.content || "",
      };

      setSavedVersion(saved);

      setReportDate(saved.reportDate);
      setTitle(saved.title);
      setContent(saved.content);

      editor.commands.setContent(
        saved.content || "",
        false
      );
    } else {
      saved = null;

      setSavedVersion(null);

      setReportDate("");

      setTitle(
        `Wednesday Report Week ${week}`
      );

      setContent("");

      editor.commands.clearContent(false);
    }

    // ----------------------------------------------------------
    // RESTORE UNFINISHED DRAFT
    // ----------------------------------------------------------

    const storedDraft =
      localStorage.getItem(
        getDraftKey(season, week)
      );

    if (storedDraft) {
      try {
        const draft = JSON.parse(
          storedDraft
        );

        const draftVersion = {
          reportDate:
            draft.reportDate || "",

          title:
            draft.title ||
            `Wednesday Report Week ${week}`,

          content:
            draft.content || "",
        };

        setReportDate(
          draftVersion.reportDate
        );

        setTitle(
          draftVersion.title
        );

        setContent(
          draftVersion.content
        );

        editor.commands.setContent(
          draftVersion.content || "",
          false
        );

        if (saved) {
          const changed =
            draftVersion.reportDate !==
              saved.reportDate ||
            draftVersion.title !==
              saved.title ||
            draftVersion.content !==
              saved.content;

          setStatus(
            changed
              ? "REVISED — UNSAVED"
              : "SAVED"
          );
        } else {
          setStatus("DRAFT");
        }
      } catch (err) {
        console.error(
          "Unable to restore Wednesday Report draft:",
          err
        );

        setStatus(
          saved
            ? "SAVED"
            : "DRAFT"
        );
      }
    } else {
      setStatus(
        saved
          ? "SAVED"
          : "DRAFT"
      );
    }

    setTimeout(() => {
      initializingRef.current = false;
    }, 0);

    setMessage("");
    setError("");
  }, [
    reportsLoaded,
    reports,
    season,
    week,
    editor,
  ]);

  // ------------------------------------------------------------
  // AUTO-SAVE DRAFT
  // ------------------------------------------------------------

  useEffect(() => {
    if (initializingRef.current) {
      return;
    }

    if (!userEditingRef.current) {
      return;
    }

    const draft = {
      reportDate,
      title,
      content,
    };

    localStorage.setItem(
      getDraftKey(season, week),
      JSON.stringify(draft)
    );

    if (savedVersion) {
      setStatus("REVISED — UNSAVED");
    } else {
      setStatus("DRAFT");
    }
  }, [
    reportDate,
    title,
    content,
    season,
    week,
    savedVersion,
  ]);

  // ------------------------------------------------------------
  // SAVE DRAFT BEFORE CHANGING WEEK
  // ------------------------------------------------------------

  const saveCurrentDraftBeforeChangingWeek =
    () => {
      if (!userEditingRef.current) {
        return;
      }

      const draft = {
        reportDate,
        title,
        content,
      };

      localStorage.setItem(
        getDraftKey(season, week),
        JSON.stringify(draft)
      );
    };

  const handleSeasonChange = (e) => {
    saveCurrentDraftBeforeChangingWeek();

    userEditingRef.current = false;

    setSeason(
      Number(e.target.value)
    );
  };

  const handleWeekChange = (e) => {
    saveCurrentDraftBeforeChangingWeek();

    userEditingRef.current = false;

    setWeek(
      Number(e.target.value)
    );
  };

  // ------------------------------------------------------------
  // SAVE / UPDATE REPORT
  // ------------------------------------------------------------

  const handleSave = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!reportDate) {
      setError(
        "Please enter the report date."
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter a report title."
      );
      return;
    }

    if (!content.trim()) {
      setError(
        "Please enter some report content."
      );
      return;
    }

    const reportYear = new Date(
      `${reportDate}T00:00:00`
    ).getFullYear();

    if (
      reportYear !== Number(season)
    ) {
      setError(
        `The report date must be in the selected ${season} season.`
      );
      return;
    }

    setSaving(true);

    try {
      const existing = findReportForWeek(
        reports,
        season,
        week
      );

      const row = {
        report_date: reportDate,
        title: title.trim(),
        content,
        week: Number(week),
      };

      let savedId = null;

      if (existing) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("wednesday_reports")
          .update(row)
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        savedId =
          data?.id || existing.id;

        setMessage(
          `2026 Week ${week} Wednesday Report updated successfully.`
        );

        setStatus(
          "REVISED — SAVED"
        );
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("wednesday_reports")
          .insert(row)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        savedId =
          data?.id || null;

        setMessage(
          `2026 Week ${week} Wednesday Report saved successfully.`
        );

        setStatus("SAVED");
      }

      setSavedVersion({
        id: savedId,
        reportDate,
        title: title.trim(),
        content,
      });

      localStorage.removeItem(
        getDraftKey(season, week)
      );

      userEditingRef.current = false;

      await loadReports();
    } catch (err) {
      console.error(
        "Save Wednesday Report error:",
        err
      );

      setError(
        err.message ||
          "Unable to save Wednesday Report."
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // FIELD CHANGES
  // ------------------------------------------------------------

  const handleReportDateChange = (e) => {
    userEditingRef.current = true;
    setReportDate(e.target.value);
  };

  const handleTitleChange = (e) => {
    userEditingRef.current = true;
    setTitle(e.target.value);
  };

  // ------------------------------------------------------------
  // LINK
  // ------------------------------------------------------------

  const addLink = () => {
    if (!editor) return;

    const url = window.prompt(
      "Enter the URL:"
    );

    if (!url) return;

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const addImage = () => {
  if (!editor) return;

  const input = document.createElement("input");

  input.type = "file";
  input.accept = "image/*";

  input.onchange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Basic safety limit
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Images must be smaller than 10 MB.");
      return;
    }

    setError("");
    setMessage("");

    try {
      /*
       * Create a safe filename.
       *
       * The original filename is retained where possible,
       * but spaces and unsafe characters are removed.
       */
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const baseName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const uniqueName =
        `${Date.now()}-${baseName || "image"}.${extension}`;

      const storagePath =
        `wednesday-reports/${season}/week-${week}/${uniqueName}`;

      setMessage("Uploading image...");

      const { error: uploadError } =
        await supabase.storage
          .from("Images")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      /*
       * Images bucket is public, so obtain the public URL.
       */
      const {
        data: publicUrlData,
      } = supabase.storage
        .from("Images")
        .getPublicUrl(storagePath);

      const imageUrl =
        publicUrlData?.publicUrl;

      if (!imageUrl) {
        throw new Error(
          "The image uploaded, but a public URL could not be generated."
        );
      }

      /*
       * Insert the image at the current editor cursor.
       */
      editor
        .chain()
        .focus()
        .setImage({
          src: imageUrl,
          alt: baseName || "Wednesday Report image",
          title: baseName || undefined,
        })
        .run();

      setMessage("Image uploaded and inserted.");

    } catch (err) {
      console.error(
        "Wednesday Report image upload error:",
        err
      );

      setError(
        err.message ||
          "Unable to upload the image."
      );
    }
  };

  input.click();
};

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <>
        <style>{`
      .report-editor .ProseMirror {
        min-height: 500px;
        outline: none;
      }

      .report-editor .ProseMirror p {
        margin: 0 0 1rem 0;
      }

      .report-editor .ProseMirror h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 1.5rem 0 0.75rem 0;
      }

      .report-editor .ProseMirror h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 1.25rem 0 0.5rem 0;
      }

      .report-editor .ProseMirror ul {
        list-style-type: disc;
        padding-left: 1.5rem;
        margin: 0 0 1rem 0;
      }

      .report-editor .ProseMirror ol {
        list-style-type: decimal;
        padding-left: 1.5rem;
        margin: 0 0 1rem 0;
      }

      .report-editor .ProseMirror li {
        margin: 0.25rem 0;
      }

      .report-editor .ProseMirror blockquote {
        border-left: 4px solid #9ca3af;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #4b5563;
        font-style: italic;
      }

      .report-editor .ProseMirror a {
        color: #2563eb;
        text-decoration: underline;
        cursor: pointer;
      }

      .report-preview p {
        margin: 0 0 1rem 0;
      }

      .report-preview h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 1.5rem 0 0.75rem 0;
      }

      .report-preview h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 1.25rem 0 0.5rem 0;
      }

      .report-preview ul {
        list-style-type: disc;
        padding-left: 1.5rem;
        margin: 0 0 1rem 0;
      }

      .report-preview ol {
        list-style-type: decimal;
        padding-left: 1.5rem;
        margin: 0 0 1rem 0;
      }

      .report-preview li {
        margin: 0.25rem 0;
      }

      .report-preview blockquote {
        border-left: 4px solid #9ca3af;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #4b5563;
        font-style: italic;
      }

      .report-preview a {
        color: #2563eb;
        text-decoration: underline;
      }

      .report-editor .ProseMirror img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1rem 0;
      }

      .report-preview img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1rem 0;
      }

      .wednesday-report-content img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1rem 0;
      }

      /* Tiptap image resize handles */     

      /* Keep images responsive */
      .report-editor .ProseMirror img {
        display: block;
        max-width: 100%;
        height: auto;
      }

      .report-editor .ProseMirror [data-resize-handle] {
        width: 12px;
        height: 12px;
        background: #2563eb;
        border: 2px solid white;
        border-radius: 2px;
        box-sizing: border-box;
        z-index: 20;
        pointer-events: auto;
      }

      .report-editor .ProseMirror [data-resize-handle="top-left"] {
        cursor: nwse-resize;
      }

      .report-editor .ProseMirror [data-resize-handle="top-right"] {
        cursor: nesw-resize;
      }

      .report-editor .ProseMirror [data-resize-handle="bottom-left"] {
        cursor: nesw-resize;
      }

      .report-editor .ProseMirror [data-resize-handle="bottom-right"] {
        cursor: nwse-resize;
      }

      /* Make the gap cursor visible around images */
.report-editor .ProseMirror-gapcursor {
  display: block;
  position: relative;
  min-height: 1.5em;
}

.report-editor .ProseMirror-gapcursor::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  height: 1.4em;
  border-left: 2px solid #2563eb;
}

    `}</style>

    <div className="max-w-6xl mx-auto space-y-6">

      <div>
        <div className="flex items-center gap-3">
          <PageHeader>
            Wednesday Report
          </PageHeader>

          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${
              status === "DRAFT"
                ? "bg-gray-200 text-gray-700"
                : status === "SAVED"
                ? "bg-green-100 text-green-700"
                : status ===
                  "REVISED — UNSAVED"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {status}
          </span>
        </div>

        <p className="text-gray-600 mt-1">
          Enter and publish the weekly Wednesday Report.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6"
      >

        {/* SEASON / WEEK / DATE / TITLE */}

        <div className="bg-white border rounded-lg p-4">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <label className="block font-semibold mb-1">
                Season
              </label>

              <select
                value={season}
                onChange={
                  handleSeasonChange
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              >
                <option value={2026}>
                  2026
                </option>

                <option value={2025}>
                  2025
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Week
              </label>

              <select
                value={week}
                onChange={
                  handleWeekChange
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              >
                {Array.from(
                  { length: 18 },
                  (_, index) =>
                    index + 1
                ).map((number) => (
                  <option
                    key={number}
                    value={number}
                  >
                    Week {number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Report Date
              </label>

              <input
                type="date"
                value={reportDate}
                onChange={
                  handleReportDateChange
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={
                  handleTitleChange
                }
                disabled={saving}
                className="w-full border rounded px-3 py-2"
              />
            </div>

          </div>
        </div>

        {/* RICH TEXT EDITOR */}

        <div className="bg-white border rounded-lg overflow-hidden">

<div className="border-b bg-gray-50 p-2 flex flex-wrap items-center gap-1">

  {/* Bold */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().toggleBold().run()
    }
    className={`px-3 py-2 rounded text-sm font-bold ${
      editor?.isActive("bold")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Bold"
  >
    B
  </button>

  {/* Italic */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().toggleItalic().run()
    }
    className={`px-3 py-2 rounded text-sm italic ${
      editor?.isActive("italic")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Italic"
  >
    It
  </button>

  {/* Strike */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().toggleStrike().run()
    }
    className={`px-3 py-2 rounded text-sm line-through ${
      editor?.isActive("strike")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Strikethrough"
  >
    S
  </button>

  <div className="w-px h-6 bg-gray-300 mx-1" />

  {/* Paragraph */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().setParagraph().run()
    }
    className={`px-3 py-2 rounded text-sm ${
      editor?.isActive("paragraph")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Paragraph"
  >
    Paragraph
  </button>

  {/* Heading 2 */}
  <button
    type="button"
    onClick={() =>
      editor
        ?.chain()
        .focus()
        .toggleHeading({ level: 2 })
        .run()
    }
    className={`px-3 py-2 rounded text-sm font-semibold ${
      editor?.isActive("heading", { level: 2 })
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Heading 2"
  >
    Heading
  </button>

  {/* Heading 3 */}
  <button
    type="button"
    onClick={() =>
      editor
        ?.chain()
        .focus()
        .toggleHeading({ level: 3 })
        .run()
    }
    className={`px-3 py-2 rounded text-sm font-medium ${
      editor?.isActive("heading", { level: 3 })
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Heading 3"
  >
    Subheading
  </button>

  <div className="w-px h-6 bg-gray-300 mx-1" />

  {/* Bullet List */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().toggleBulletList().run()
    }
    className={`px-3 py-2 rounded text-sm ${
      editor?.isActive("bulletList")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Bullet List"
  >
    • List
  </button>

  {/* Numbered List */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().toggleOrderedList().run()
    }
    className={`px-3 py-2 rounded text-sm ${
      editor?.isActive("orderedList")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Numbered List"
  >
    1. List
  </button>

  {/* Quote */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().toggleBlockquote().run()
    }
    className={`px-3 py-2 rounded text-sm ${
      editor?.isActive("blockquote")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Block Quote"
  >
    Quote
  </button>

  <div className="w-px h-6 bg-gray-300 mx-1" />

  {/* Link */}
  <button
    type="button"
    onClick={addLink}
    className={`px-3 py-2 rounded text-sm ${
      editor?.isActive("link")
        ? "bg-gray-300"
        : "hover:bg-gray-200"
    }`}
    title="Add Link"
  >
    Link
  </button>

  {/* Image */}
  <button
    type="button"
    onClick={addImage}
    className="px-3 py-2 rounded text-sm hover:bg-gray-200"
    title="Insert Image"
  >
    Image
  </button>

  {/* Remove Link */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().unsetLink().run()
    }
    disabled={!editor?.isActive("link")}
    className="px-3 py-2 rounded text-sm hover:bg-gray-200 disabled:opacity-40"
    title="Remove Link"
  >
    Unlink
  </button>

  <div className="w-px h-6 bg-gray-300 mx-1" />

  {/* Undo */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().undo().run()
    }
    disabled={!editor?.can().undo()}
    className="px-3 py-2 rounded text-sm hover:bg-gray-200 disabled:opacity-40"
    title="Undo"
  >
    ↶
  </button>

  {/* Redo */}
  <button
    type="button"
    onClick={() =>
      editor?.chain().focus().redo().run()
    }
    disabled={!editor?.can().redo()}
    className="px-3 py-2 rounded text-sm hover:bg-gray-200 disabled:opacity-40"
    title="Redo"
  >
    ↷
  </button>

</div>
<EditorContent
  editor={editor}
  className="report-editor min-h-[500px] px-5 py-4 focus-within:outline-none"
/>

        </div>

        {/* ERRORS */}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4">
            <strong>
              Error:
            </strong>{" "}
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4">
            {message}
          </div>
        )}

        {/* SAVE */}

        <div className="flex justify-end">

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : savedVersion
              ? "Save Revision"
              : "Save & Publish Report"}
          </button>

        </div>

      </form>

      {/* PREVIEW */}

      {content && (
        <div className="bg-white border rounded-lg overflow-hidden">

          <div className="bg-gray-100 border-b px-4 py-3">
            <h2 className="font-semibold">
              Preview
            </h2>
          </div>

          <div className="p-6">

            <h2 className="text-xl font-semibold mb-4">
              {title}{" "}
              (Week {week})
            </h2>

            <div
              className="report-preview max-w-full"
              dangerouslySetInnerHTML={{
                __html: content,
              }}
            />

          </div>
        </div>
      )}
      
    </div>
    </>
  );
}