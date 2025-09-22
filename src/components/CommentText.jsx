import React from "react";

// Regex to match URLs and bare domains
const urlRegex =
  /\b((https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?))\b/g;

export default function CommentText({ username, content }) {
  const elements = [];
  let lastIndex = 0;

  // Iterate through all URL matches
  for (const match of content.matchAll(urlRegex)) {
    const url = match[0];
    const start = match.index;

    // Push text before the URL
    if (start > lastIndex) {
      elements.push(content.slice(lastIndex, start));
    }

    // Ensure href has protocol
    const href = url.startsWith("http") ? url : `https://${url}`;

    // Push the link
    elements.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-words"
      >
        {url}
      </a>
    );

    lastIndex = start + url.length;
  }

  // Push any remaining text after the last URL
  if (lastIndex < content.length) {
    elements.push(content.slice(lastIndex));
  }

  return (
    <p className="text-sm text-gray-600 whitespace-pre-line break-words">
      <span className="font-semibold">{username ?? "Unknown"}:</span>{" "}
      {elements}
    </p>
  );
}
