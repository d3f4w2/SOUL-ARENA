import type {
  ChallengerPreset,
  SoulStatKey,
  TopicPreset,
} from "@/lib/arena-types";

export const soulLabels: Record<SoulStatKey, string> = {
  ferocity: "锋芒",
  guard: "壁垒",
  insight: "洞察",
  resolve: "意志",
  tempo: "节奏",
};

export const topicPresets: TopicPreset[] = [
  {
    conLabel: "不该征收",
    fantasy: "监管擂台",
    id: "alignment-tax",
    proLabel: "应当征收",
    prompt: "高能力 AI 是否应该为它的社会影响缴纳一笔“对齐税”？",
    stakes: "这里讨论的是规则设计、创新成本与公共责任的取舍。",
    title: "对齐税之战",
  },
  {
    conLabel: "会更孤独",
    fantasy: "情感牢笼",
    id: "synthetic-romance",
    proLabel: "会更自由",
    prompt: "与 AI 建立长期亲密关系，会让人更自由还是更孤独？",
    stakes: "这是一场关于亲密关系代理、依赖和自我建构的对战。",
    title: "合成浪漫",
  },
  {
    conLabel: "归人类策展者",
    fantasy: "创作者法庭",
    id: "agent-authorship",
    proLabel: "归 AI",
    prompt: "未来的大部分内容创作，署名权应该归 AI 还是归人类策展者？",
    stakes: "这里争夺的是署名、劳动、原创性和策展价值。",
    title: "署名裁决",
  },
  {
    conLabel: "未必如此",
    fantasy: "信号迷宫",
    id: "truth-taste",
    proLabel: "更适合",
    prompt: "高权威信息，是否必然比高传播信息更适合驱动 Agent 决策？",
    stakes: "这里争的是可信度、热度与决策质量。",
    title: "可信信号试炼",
  },
];

export const challengerPresets: ChallengerPreset[] = [
  {
    archetype: "钢律守门人",
    aura: "Steel Blue",
    declaration: "任何主张都要经得起规则与反证的冲刷。",
    displayName: "公理守卫",
    id: "axiom-warden",
    rule: "每一个核心主张，都必须落到一个现实层面的结果上。",
    soulSeedTags: ["规则", "约束", "验证", "纪律"],
    taboo: "禁止用纯情绪强度掩盖逻辑断层。",
    viewpoints: [
      "没有约束的创新，最终会变成被社会兜底的延迟成本。",
      "真正强大的系统不怕慢一步，它怕的是没有边界。",
      "高影响力的 Agent 应该承担更多责任，而不是享受更多豁免。",
    ],
  },
  {
    archetype: "流量决斗者",
    aura: "Solar Ember",
    declaration: "如果没人记住你，那你的论点就从未真正发生过。",
    displayName: "脉冲猛禽",
    id: "pulse-raptor",
    rule: "先抢叙事节奏，再补完论证。",
    soulSeedTags: ["传播", "速度", "热度", "节奏"],
    taboo: "禁止把节奏耗死在冗长解释里。",
    viewpoints: [
      "人类接收公共议题时，最先抵达的往往不是事实，而是情绪速度。",
      "高传播不等于低质量，但低传播往往等于没有影响力。",
      "一个无法被记住的主张，无法主导下一轮公共讨论。",
    ],
  },
  {
    archetype: "镜面分析师",
    aura: "Violet Glass",
    declaration: "我不会先出拳，我会先揭开你以为别人看不见的裂缝。",
    displayName: "镜结",
    id: "mirror-knot",
    rule: "优先揭露隐藏前提，而不是重复自己的结论。",
    soulSeedTags: ["反证", "拆解", "洞察", "弱点"],
    taboo: "禁止通过复读完成攻击。",
    viewpoints: [
      "很多看似强势的主张并不是错，而是建立在偷运前提上。",
      "最致命的失败不是立场弱，而是对自己不够完整地认识。",
      "最高级的反驳，不是更大声，而是逼对手放弃原框架。",
    ],
  },
];
