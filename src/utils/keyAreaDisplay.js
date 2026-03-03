const toSafeString = (value) => String(value || "").trim();

export const getKeyAreaTitle = (keyArea) =>
  toSafeString(keyArea?.title || keyArea?.name || "Untitled");

export const isIdeasKeyArea = (keyArea) => {
  const title = getKeyAreaTitle(keyArea).toLowerCase();
  return title === "ideas" || Boolean(keyArea?.is_default);
};

export const getKeyAreaNumber = (keyArea, fallbackIndex = null) => {
  if (isIdeasKeyArea(keyArea)) return null;

  const raw =
    keyArea?.position ??
    keyArea?.order ??
    keyArea?.index ??
    keyArea?.number ??
    null;
  const parsed = Number(raw);

  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 9) {
    return Math.floor(parsed);
  }

  if (typeof fallbackIndex === "number" && Number.isFinite(fallbackIndex)) {
    const n = Math.floor(fallbackIndex) + 1;
    if (n >= 1 && n <= 9) return n;
  }

  return null;
};

export const formatKeyAreaLabel = (keyArea, fallbackIndex = null) => {
  const title = getKeyAreaTitle(keyArea);

  if (isIdeasKeyArea(keyArea)) {
    return `💡 ${title || "Ideas"}`;
  }

  const number = getKeyAreaNumber(keyArea, fallbackIndex);
  if (number) return `${number}. ${title}`;

  return title;
};
