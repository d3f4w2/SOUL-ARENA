import { BattleReplay } from "@/components/battle-replay";

export default async function BattlePage({
  params,
}: {
  params: Promise<{ battleId: string }>;
}) {
  const { battleId } = await params;

  return <BattleReplay battleId={battleId} />;
}
