"use client";

import type { AssetRecord } from "@/lib/types";

export default function AssetLinkControl({
  assets,
  value,
  allowedTypes,
  onChange,
  label = "绑定素材",
}: {
  assets: AssetRecord[];
  value: string | null;
  allowedTypes: AssetRecord["type"][];
  onChange: (assetId: string | null) => void;
  label?: string;
}) {
  const filteredAssets = assets.filter((asset) => allowedTypes.includes(asset.type));

  return (
    <label className="block">
      <span className="text-xs text-neutral-500 mb-1.5 block">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          if (event.target.value === "__unlink__") {
            onChange(null);
            return;
          }
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-md px-2 py-2 outline-none hover:border-neutral-700 focus:border-neutral-600"
      >
        <option value="" disabled>
          {filteredAssets.length === 0 ? "暂无可用素材" : "选择本地素材"}
        </option>
        {filteredAssets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.name}
          </option>
        ))}
        {value && <option value="__unlink__">解除绑定</option>}
      </select>
    </label>
  );
}
