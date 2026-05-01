import { importComboSoundPackArchive } from "@/lib/comboSoundPackArchive";
import {
  createId,
  createSoundAssetFromBlob,
  sortComboSoundPacks,
  type ComboSoundPack,
  type CustomSoundSettings,
} from "@/lib/soundAssets";

interface BuiltInComboPackSource {
  archiveUrl: string;
  id: string;
  name: string;
}

const builtInComboPackSources: BuiltInComboPackSource[] = [
  {
    archiveUrl: "/default-combo-packs/jinitaimei-default.aimcombo.zip",
    id: "builtin_combo_pack_jinitaimei",
    name: "鸡你太美🐔",
  },
  {
    archiveUrl: "/default-combo-packs/changtiao-default.aimcombo.zip",
    id: "builtin_combo_pack_changtiao_rap_basketball",
    name: "唱跳rap篮球🏀",
  },
];

let ensurePromise: Promise<CustomSoundSettings | null> | null = null;

export function sortAndNormalizeComboPacks(packs: ComboSoundPack[]) {
  return sortComboSoundPacks(packs.map((pack) => ({ ...pack, builtIn: Boolean(pack.builtIn) })));
}

export async function ensureBuiltInComboPacks(custom: CustomSoundSettings) {
  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = ensureBuiltInComboPacksInner(custom).finally(() => {
    ensurePromise = null;
  });
  return ensurePromise;
}

async function ensureBuiltInComboPacksInner(custom: CustomSoundSettings) {
  const existingBuiltInIds = new Set(custom.comboMusic.packs.filter((pack) => pack.builtIn).map((pack) => pack.id));
  const missingSources = builtInComboPackSources.filter((source) => !existingBuiltInIds.has(source.id));

  if (missingSources.length === 0) {
    const normalizedPacks = sortAndNormalizeComboPacks(custom.comboMusic.packs);
    if (normalizedPacks.every((pack, index) => pack === custom.comboMusic.packs[index])) {
      return null;
    }

    return {
      ...custom,
      comboMusic: {
        ...custom.comboMusic,
        packs: normalizedPacks,
      },
    };
  }

  const importedPacks: ComboSoundPack[] = [];
  for (const source of missingSources) {
    const response = await fetch(source.archiveUrl);
    if (!response.ok) {
      throw new Error(`加载内置整合包失败: ${source.name}`);
    }

    const zipBlob = await response.blob();
    const archiveFile = new File([zipBlob], `${source.name}.aimTrainer.zip`, { type: "application/zip" });
    const importedArchive = await importComboSoundPackArchive(archiveFile);
    const asset = await createSoundAssetFromBlob({
      blob: importedArchive.audioBlob,
      name: importedArchive.audioFileName,
      type: importedArchive.audioMimeType,
    });

    importedPacks.push({
      builtIn: true,
      clips: importedArchive.clips
        .map((clip) => ({
          ...clip,
          id: createId("combo_clip"),
        }))
        .sort((first, second) => first.index - second.index),
      id: source.id,
      name: source.name,
      sourceAssetId: asset.id,
      updatedAt: Date.now(),
    });
  }

  const nextPacks = sortAndNormalizeComboPacks([...custom.comboMusic.packs, ...importedPacks]);
  const activePack =
    nextPacks.find((pack) => pack.id === custom.comboMusic.activePackId) ??
    nextPacks.find((pack) => pack.sourceAssetId === custom.comboMusic.sourceAssetId) ??
    nextPacks[0] ??
    null;

  return {
    ...custom,
    comboMusic: {
      ...custom.comboMusic,
      activePackId: activePack?.id ?? custom.comboMusic.activePackId,
      clips: activePack?.clips ?? custom.comboMusic.clips,
      packs: nextPacks,
      sourceAssetId: activePack?.sourceAssetId ?? custom.comboMusic.sourceAssetId,
    },
  };
}
