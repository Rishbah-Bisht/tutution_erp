const DEFAULT_THEME_COLORS = ['#1b3a7a', '#c53030'];

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeHexColor = (value, fallback) => {
    const color = String(value || '').trim();
    return HEX_COLOR_REGEX.test(color) ? color : fallback;
};

const normalizeThemeColors = (rawColors, fallback = DEFAULT_THEME_COLORS) => {
    const safeFallback = Array.isArray(fallback) && fallback.length >= 2
        ? fallback
        : DEFAULT_THEME_COLORS;

    if (!Array.isArray(rawColors) || rawColors.length < 2) {
        return [...safeFallback];
    }

    return [
        normalizeHexColor(rawColors[0], safeFallback[0]),
        normalizeHexColor(rawColors[1], safeFallback[1])
    ];
};

module.exports = {
    DEFAULT_THEME_COLORS,
    normalizeHexColor,
    normalizeThemeColors
};
