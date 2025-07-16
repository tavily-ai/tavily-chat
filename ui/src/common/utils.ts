export const formatSearchParamsForDisplay = (params: object): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatValue = (value: any): string => {
    if (value === null) return "null";
    if (typeof value === "undefined") return "undefined";
    if (typeof value === "string") return `"${value}"`;
    if (Array.isArray(value)) {
      return value.length === 0
        ? "[]"
        : `[\n    ${value.map((v) => formatValue(v)).join(",\n    ")}\n  ]`;
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formattedParams = Object.entries(params)
    .map(([key, value]) => `  ${key}: ${formatValue(value)},`)
    .join("\n");

  return `{\n${formattedParams}\n}`;
};

export function getWebsiteName(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const domainParts = hostname.split(".");

    if (domainParts[0] === "www") {
      return domainParts[1];
    }
    return domainParts[0];
  } catch (error) {
    console.error("Invalid URL:", error);
    return null; // or handle the error as needed
  }
}

export function convertDateFormat(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

export function truncateString(str: string, length = 70) {
  if (str.length > length) {
    return str.slice(0, length) + "..."; // Add ellipsis if truncated
  }
  return str; // Return the original string if it's shorter than the specified length
}

export const extractTitleFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    
    // Remove leading and trailing slashes
    pathname = pathname.replace(/^\/+|\/+$/g, '');
    
    // If it's just the root path, use the hostname
    if (!pathname) {
      return urlObj.hostname.replace(/^www\./, '');
    }
    
    // Split by slashes and take the last meaningful part
    const parts = pathname.split('/');
    let title = parts[parts.length - 1];
    
    // If the last part has an extension, remove it
    title = title.replace(/\.[^/.]+$/, '');
    
    // Replace hyphens and underscores with spaces
    title = title.replace(/[-_]/g, ' ');
    
    // Capitalize words
    title = title.replace(/\b\w/g, l => l.toUpperCase());
    
    // If title is empty or too short, fall back to hostname
    if (!title || title.length < 2) {
      return urlObj.hostname.replace(/^www\./, '');
    }
    
    return title;
  } catch {
    // If URL parsing fails, return the original URL
    return url;
  }
};

export const cleanMarkdownForPreview = (content: string): string => {
  return (
    content
      // Remove image references
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/!\[.*?\]/g, "")
      // Remove links but keep the text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove bare URLs (http/https/www)
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/www\.[^\s]+/g, "")
      // Remove email addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "")
      // Remove video references and embeds
      .replace(/\b(youtube|vimeo|dailymotion|twitch)\.com[^\s]*/gi, "")
      .replace(/\b(youtu\.be)[^\s]*/gi, "")
      .replace(/\[.*?(video|watch|play).*?\]/gi, "")
      .replace(/\b(embed|iframe|video)\b[^\n]*/gi, "")
      // Remove social media references
      .replace(/\b(linkedin|twitter|facebook|instagram|tiktok)\.com[^\s]*/gi, "")
      .replace(/\b@[A-Za-z0-9_]+\b/g, "")
      .replace(/\b#[A-Za-z0-9_]+\b/g, "")
      // Remove common social sharing text
      .replace(/\b(share on|follow us on|connect with us|like us on)\b[^\n]*/gi, "")
      .replace(/\b(tweet|retweet|share|like|subscribe)\b[^\n]*/gi, "")
      // Remove file references
      .replace(/\[[^\]]*\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)[^\]]*\]/gi, "")
      .replace(/\b[^\s]*\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)\b/gi, "")
      // Remove navigation elements
      .replace(/\b(home|about|contact|privacy|terms|sitemap|menu|navigation)\b[^\n]*/gi, "")
      .replace(/\b(click here|read more|learn more|see more|view all)\b[^\n]*/gi, "")
      // Remove common footer/header text
      .replace(/\b(copyright|©|\(c\)|all rights reserved)\b[^\n]*/gi, "")
      .replace(/\b(powered by|designed by|created by)\b[^\n]*/gi, "")
      // Remove phone numbers
      .replace(/\+?[\d\s\-\(\)]{10,}/g, "")
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold and italic formatting
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove strikethrough
      .replace(/~~([^~]+)~~/g, "$1")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`{3,}[\s\S]*?`{3,}/g, "")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, "")
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove excessive newlines
      .replace(/\n{3,}/g, "\n\n")
      // Remove excessive spaces
      .replace(/[ \t]{2,}/g, " ")
      // Remove empty lines with just punctuation
      .replace(/^[^\w\n]*$/gm, "")
      // Clean up extra whitespace
      .trim()
  );
};
