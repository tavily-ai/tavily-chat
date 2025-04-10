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
