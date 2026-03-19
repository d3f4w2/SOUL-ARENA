import type {
  ArenaParticipantPersonaSnapshot,
  ArenaParticipantSource,
} from "@/lib/arena-types";

const unique = (items: Array<string | null | undefined>) =>
  [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

const clampText = (value: string | null | undefined, max: number) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length > max
    ? `${trimmed.slice(0, Math.max(1, max - 3)).trim()}...`
    : trimmed;
};

const clampList = (
  values: Array<string | null | undefined>,
  maxItems: number,
  maxChars: number,
) =>
  unique(values.map((item) => clampText(item ?? null, maxChars))).slice(
    0,
    maxItems,
  );

const sanitizePersonaSnapshot = (
  snapshot: ArenaParticipantPersonaSnapshot,
): ArenaParticipantPersonaSnapshot => ({
  ...snapshot,
  archetype: clampText(snapshot.archetype ?? null, 80),
  aura: clampText(snapshot.aura ?? null, 80),
  avatarUrl: clampText(snapshot.avatarUrl ?? null, 400),
  bio: clampText(snapshot.bio ?? null, 220),
  candidateId: snapshot.candidateId.trim(),
  declaration: clampText(snapshot.declaration ?? null, 220),
  displayId: clampText(snapshot.displayId ?? null, 120),
  displayName: clampText(snapshot.displayName, 80) ?? "Anonymous Persona",
  memoryAnchors: clampList(snapshot.memoryAnchors ?? [], 4, 160),
  participantId: clampText(snapshot.participantId ?? null, 160) ?? undefined,
  route: clampText(snapshot.route ?? null, 160),
  rule: clampText(snapshot.rule ?? null, 180),
  secondMeUserId: clampText(snapshot.secondMeUserId ?? null, 120),
  shades: clampList(snapshot.shades ?? [], 6, 24),
  soulSeedTags: clampList(snapshot.soulSeedTags ?? [], 6, 24),
  sourceLabel: clampText(snapshot.sourceLabel ?? null, 80),
  taboo: clampText(snapshot.taboo ?? null, 180),
  viewpoints: clampList(snapshot.viewpoints ?? [], 4, 180),
});

export const buildPersonaSnapshotFromSource = (
  source: ArenaParticipantSource,
): ArenaParticipantPersonaSnapshot | null => {
  if (
    (source.provider !== "history" && source.provider !== "zhihu") ||
    !source.displayName
  ) {
    return null;
  }

  const user = source.user ?? {};
  const sourceMeta = source.sourceMeta ?? {};
  const memoryAnchors = clampList(
    source.softMemory.map((memory) =>
      readString(memory.summary) ??
      readString(memory.text) ??
      readString(memory.content) ??
      readString(memory.title),
    ),
    4,
    160,
  );
  const shades = clampList(
    source.shades.map((shade) => readString(shade.label) ?? readString(shade.name)),
    6,
    24,
  );

  return sanitizePersonaSnapshot({
    archetype:
      readString(user.arenaArchetype) ??
      readString(sourceMeta.archetype) ??
      null,
    aura: readString(user.arenaAura) ?? readString(sourceMeta.aura) ?? null,
    avatarUrl: source.avatarUrl ?? null,
    bio:
      readString(user.bio) ??
      readString(user.selfIntroduction) ??
      readString(user.arenaDeclaration) ??
      null,
    candidateId:
      source.candidateId ??
      `${source.provider}:${source.displayId ?? source.participantId ?? source.displayName}`,
    declaration: readString(user.arenaDeclaration) ?? readString(user.bio) ?? null,
    displayId: source.displayId ?? null,
    displayName: source.displayName,
    memoryAnchors,
    participantId: source.participantId,
    provider: source.provider,
    route: readString(user.route),
    rule: readString(user.arenaRule),
    secondMeUserId: source.secondMeUserId ?? null,
    shades,
    soulSeedTags: clampList(readStringArray(user.arenaSoulSeedTags), 6, 24),
    sourceLabel: source.sourceLabel ?? null,
    sourceMeta,
    taboo: readString(user.arenaTaboo),
    viewpoints: clampList(readStringArray(user.arenaViewpoints), 4, 180),
  });
};
