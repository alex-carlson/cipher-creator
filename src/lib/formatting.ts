function formatRelativeDate(date) {
    const now = new Date();

    // Convert Firestore Timestamp to Date
    const created =
        typeof date?.toDate === "function" ? date.toDate() : new Date(date);

    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (seconds < 0) return "just now";

    const units = [
        { name: "year", seconds: 31536000 },
        { name: "month", seconds: 2592000 },
        { name: "day", seconds: 86400 },
        { name: "hour", seconds: 3600 },
        { name: "minute", seconds: 60 },
        { name: "second", seconds: 1 },
    ];

    const formatter = new Intl.RelativeTimeFormat("en", {
        numeric: "always",
    });

    for (const unit of units) {
        const value = Math.floor(seconds / unit.seconds);

        if (value >= 1) {
            return formatter.format(-value, unit.name);
        }
    }

    return "just now";
}

export { formatRelativeDate };