export function colorForRatio(r) {
    if (r <= 0)
        return "#EAEAEA";
    if (r <= 0.15)
        return "#E3F2FD";
    if (r <= 0.3)
        return "#BBDEFB";
    if (r <= 0.5)
        return "#90CAF9";
    if (r <= 0.7)
        return "#64B5F6";
    if (r <= 0.9)
        return "#42A5F5";
    return "#1E88E5";
}
